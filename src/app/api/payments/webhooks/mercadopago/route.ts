export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { verifyWebhookSignature, getPayment } from "@/lib/payments/mercadopago";
import { db } from "@/db";
import { payments } from "@/db/schema/payments";
import { testSessions } from "@/db/schema/sessions";
import { eq } from "drizzle-orm";

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

  const paymentId = extractPaymentId(body, url);
  if (!paymentId) {
    return NextResponse.json({ error: "payment id not found" }, { status: 400 });
  }

  try {
    const p = await getPayment(paymentId);

    const sessionId = p.external_reference ?? "";
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
        externalReference: sessionId || null,
        payerEmail: payerEmail || null,
      })
      .onConflictDoUpdate({
        target: payments.id,
        set: {
          status: p.status ?? "pending",
          amountCents,
          providerPaymentId,
          externalReference: sessionId || null,
          payerEmail: payerEmail || null,
        },
      });

    // Se aprovado, marcar sessão como 'paid'
    if (p.status === "approved" && sessionId) {
      await db.update(testSessions).set({ paid: true as any }).where(eq(testSessions.id, sessionId));
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
