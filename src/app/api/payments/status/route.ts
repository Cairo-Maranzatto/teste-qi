export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { testSessions } from "@/db/schema/sessions";
import { payments } from "@/db/schema/payments";
import { desc, eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) return NextResponse.json({ error: "sessionId é obrigatório" }, { status: 400 });

    const [session] = await db.select({ paid: testSessions.paid }).from(testSessions).where(eq(testSessions.id, sessionId)).limit(1);
    const paid = Boolean(session?.paid);

    const [last] = await db
      .select({ status: payments.status, updatedAt: payments.updatedAt, amountCents: payments.amountCents, providerPaymentId: payments.providerPaymentId })
      .from(payments)
      .where(eq(payments.sessionId, sessionId))
      .orderBy(desc(payments.updatedAt))
      .limit(1);

    return NextResponse.json({ ok: true, paid, lastPayment: last ?? null });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "failed" }, { status: 500 });
  }
}
