export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { testSessions } from "@/db/schema/sessions";
import { payments } from "@/db/schema/payments";
import { desc, eq } from "drizzle-orm";
import { searchPaymentsByExternalReference } from "@/lib/payments/mercadopago";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) return NextResponse.json({ error: "sessionId é obrigatório" }, { status: 400 });

    const [session] = await db.select({ paid: testSessions.paid }).from(testSessions).where(eq(testSessions.id, sessionId)).limit(1);
    const paid = Boolean(session?.paid);

    let [last] = await db
      .select({ status: payments.status, updatedAt: payments.updatedAt, amountCents: payments.amountCents, providerPaymentId: payments.providerPaymentId, externalReference: payments.externalReference })
      .from(payments)
      .where(eq(payments.sessionId, sessionId))
      .orderBy(desc(payments.updatedAt))
      .limit(1);

    // Fallback do webhook: se não pago ainda, tentar conciliar pelo Mercado Pago usando external_reference
    if (!paid) {
      const extRef = last?.externalReference || sessionId; // salvamos o rawRef no webhook; se faltar, use o sessionId
      if (extRef) {
        try {
          const search = await searchPaymentsByExternalReference(extRef);
          const found = search.results?.[0];
          if (found) {
            const amountCents = Math.round((found.transaction_amount ?? 0) * 100);
            await db
              .insert(payments)
              .values({
                id: String(found.id),
                sessionId,
                provider: "mercadopago",
                providerPaymentId: String(found.id),
                amountCents,
                status: found.status ?? "pending",
                externalReference: found.external_reference ?? extRef,
              })
              .onConflictDoUpdate({
                target: payments.id,
                set: {
                  status: found.status ?? "pending",
                  amountCents,
                  providerPaymentId: String(found.id),
                  externalReference: found.external_reference ?? extRef,
                },
              });
            // Se aprovado, marque sessão como paga
            if (found.status === "approved") {
              await db.update(testSessions).set({ paid: true as any }).where(eq(testSessions.id, sessionId));
            }
            // Recarregar último pagamento após upsert
            ;[last] = await db
              .select({ status: payments.status, updatedAt: payments.updatedAt, amountCents: payments.amountCents, providerPaymentId: payments.providerPaymentId, externalReference: payments.externalReference })
              .from(payments)
              .where(eq(payments.sessionId, sessionId))
              .orderBy(desc(payments.updatedAt))
              .limit(1);
          }
        } catch {}
      }
    }

    return NextResponse.json({ ok: true, paid, lastPayment: last ?? null });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "failed" }, { status: 500 });
  }
}
