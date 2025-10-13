export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { env } from "@/lib/common/env";
import { createPreference } from "@/lib/payments/mercadopago";
import { db } from "@/db";
import { payments } from "@/db/schema/payments";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const sessionId: string | undefined = body?.sessionId;
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId é obrigatório" }, { status: 400 });
    }
    const amountCents: number =
      typeof body?.amountCents === "number"
        ? body.amountCents
        : body?.retest
        ? 200
        : 500;

    const backUrlSuccess = `${env.SITE_URL}/test/${sessionId}/result?status=success`;
    const backUrlFailure = `${env.SITE_URL}/checkout?status=failure&session=${sessionId}`;
    const backUrlPending = `${env.SITE_URL}/checkout?status=pending&session=${sessionId}`;

    const pref = await createPreference({
      sessionId,
      amountCents,
      backUrlSuccess,
      backUrlFailure,
      backUrlPending,
      metadata: body?.metadata ?? {},
    });

    // Registrar pagamento pendente vinculado à sessão (por preferenceId)
    try {
      await db
        .insert(payments)
        .values({
          id: String(pref.id),
          sessionId,
          provider: "mercadopago",
          preferenceId: String(pref.id),
          amountCents,
          status: "pending",
          externalReference: sessionId,
        })
        .onConflictDoNothing();
    } catch {}

    return NextResponse.json({
      id: pref.id,
      init_point: pref.init_point ?? pref.sandbox_init_point ?? null,
      sessionId,
      amountCents,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
