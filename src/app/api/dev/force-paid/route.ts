export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { testSessions } from "@/db/schema/sessions";
import { payments } from "@/db/schema/payments";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Indisponível em produção" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({} as any));
    const sessionId: string | undefined = body?.sessionId;
    const amountCents: number = typeof body?.amountCents === "number" ? Math.max(100, body.amountCents | 0) : 500;
    if (!sessionId) return NextResponse.json({ error: "sessionId é obrigatório" }, { status: 400 });

    await db.update(testSessions).set({ paid: true as any }).where(eq(testSessions.id, sessionId));

    const devId = `dev-${Date.now()}`;
    await db
      .insert(payments)
      .values({
        id: devId,
        sessionId,
        provider: "mercadopago",
        providerPaymentId: devId,
        amountCents,
        status: "approved",
        externalReference: sessionId,
        preferenceId: devId,
      })
      .onConflictDoNothing();

    return NextResponse.json({ ok: true, sessionId, amountCents, id: devId });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "failed" }, { status: 500 });
  }
}
