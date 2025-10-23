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
        ? Math.round(body.amountCents)
        : body?.retest
        ? 199
        : 499;

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
      fbp: typeof body?.fbp === "string" ? body.fbp : undefined,
      fbc: typeof body?.fbc === "string" ? body.fbc : undefined,
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
          externalReference: pref.external_reference ?? sessionId,
        })
        .onConflictDoNothing();
    } catch {}

    const isTestEnv = (env.MP_ENV || "0") === "1";
    const initPoint = isTestEnv ? (pref.sandbox_init_point ?? pref.init_point ?? null) : (pref.init_point ?? pref.sandbox_init_point ?? null);

    return NextResponse.json({
      id: pref.id,
      init_point: initPoint,
      sessionId,
      amountCents,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
