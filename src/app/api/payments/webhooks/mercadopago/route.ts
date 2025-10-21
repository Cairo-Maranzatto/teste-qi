export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { verifyWebhookSignature, getPayment, getMerchantOrder } from "@/lib/payments/mercadopago";
import { db } from "@/db";
import { payments } from "@/db/schema/payments";
import { testSessions } from "@/db/schema/sessions";
import { eq } from "drizzle-orm";
import { sendPurchaseFromWebhook } from "@/lib/meta/capi";

function extractPaymentId(body: any, url: URL): string | null {
  // Tentar formatos comuns do MP
  // 1) Notificação nova: { type: 'payment', data: { id: '12345' } }
  const v1 = body?.data?.id ?? body?.data?.resource?.id;
  if (v1) return String(v1);
  // 2) Antigo: query params ?id=12345&topic=payment
  const qpId = url.searchParams.get("id");
  const qpTopic = url.searchParams.get("topic");
  if (qpId && (qpTopic?.toLowerCase() === "payment" || !qpTopic)) return String(qpId);
  // 3) Body direto { id: 12345 }
  if (body?.id) return String(body.id);
  return null;
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const raw = await req.text();
  const headers = req.headers;

  // Verificação de assinatura (permissiva em dev)
  const okSig = verifyWebhookSignature(headers as any, raw);
  if (!okSig) return NextResponse.json({ error: "invalid signature" }, { status: 400 });

  let body: any = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }

  const topic = ((url.searchParams.get("topic") || body?.type || "") as string).toLowerCase();

  // Suporte ao tópico merchant_order: buscar a order e processar os payments associados
  if (topic === "merchant_order") {
    const orderId = url.searchParams.get("id") || (body?.id ? String(body.id) : "");
    if (!orderId) {
      return NextResponse.json({ error: "merchant order id not found" }, { status: 400 });
    }
    try {
      const mo = await getMerchantOrder(orderId);
      const rawRef = mo.external_reference || "";
      const sessionId = (rawRef.split("|")[0] || "");
      const paymentsArr: number[] = Array.isArray(mo.payments)
        ? mo.payments
            .map((e: any) => (typeof e?.id === "number" ? e.id : typeof e?.payment?.id === "number" ? e.payment.id : null))
            .filter((v: any) => v !== null)
        : [];
      let anyApproved = false;
      for (const pid of paymentsArr) {
        const p = await getPayment(String(pid));
        const amountCents = Math.round((p.transaction_amount ?? 0) * 100);
        const providerPaymentId = String(p.id);
        const payerEmail = p.payer?.email ?? null;
        const ref = p.external_reference ?? rawRef;
        await db
          .insert(payments)
          .values({
            id: providerPaymentId,
            sessionId,
            provider: "mercadopago",
            providerPaymentId,
            amountCents,
            status: p.status ?? "pending",
            externalReference: ref || null,
            payerEmail: payerEmail || null,
          })
          .onConflictDoUpdate({
            target: payments.id,
            set: {
              status: p.status ?? "pending",
              amountCents,
              providerPaymentId,
              externalReference: ref || null,
              payerEmail: payerEmail || null,
            },
          });
        if (p.status === "approved" && sessionId) {
          anyApproved = true;
          await db.update(testSessions).set({ paid: true as any }).where(eq(testSessions.id, sessionId));
          try {
            await sendPurchaseFromWebhook({
              providerPaymentId,
              amountCents,
              sessionId,
              payerEmail,
              externalReferenceRaw: ref ?? null,
            });
          } catch {}
        }
      }
      return NextResponse.json({ ok: true, processed: paymentsArr.length, anyApproved });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message ?? "failed merchant order" }, { status: 500 });
    }
  }

  const paymentId = extractPaymentId(body, url);
  if (!paymentId) {
    return NextResponse.json({ error: "payment id not found" }, { status: 400 });
  }

  try {
    const p = await getPayment(paymentId);

    const rawRef = p.external_reference ?? "";
    const sessionId = (rawRef.split("|")[0] || "");
    const amountCents = Math.round((p.transaction_amount ?? 0) * 100);
    const providerPaymentId = String(p.id);
    const payerEmail = p.payer?.email ?? null;

    // Upsert em payments
    await db
      .insert(payments)
      .values({
        id: providerPaymentId,
        sessionId,
        provider: "mercadopago",
        providerPaymentId,
        amountCents,
        status: p.status ?? "pending",
        externalReference: rawRef || null,
        payerEmail: payerEmail || null,
      })
      .onConflictDoUpdate({
        target: payments.id,
        set: {
          status: p.status ?? "pending",
          amountCents,
          providerPaymentId,
          externalReference: rawRef || null,
          payerEmail: payerEmail || null,
        },
      });

    // Se aprovado, marcar sessão como 'paid'
    if (p.status === "approved" && sessionId) {
      await db.update(testSessions).set({ paid: true as any }).where(eq(testSessions.id, sessionId));
      try {
        await sendPurchaseFromWebhook({
          providerPaymentId,
          amountCents,
          sessionId,
          payerEmail,
          externalReferenceRaw: p.external_reference ?? null,
        });
      } catch (e) {
        // não falhar o webhook por erro da CAPI
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  // Suporte a validações antigas do MP via query
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: true });
  try {
    const p = await getPayment(String(id));
    return NextResponse.json({ status: p.status, id: p.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
