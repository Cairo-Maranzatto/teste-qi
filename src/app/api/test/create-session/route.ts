import { NextResponse } from "next/server";
import { db } from "@/db";
import { testSessions } from "@/db/schema/sessions";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const sessionId: string = body?.sessionId || `sess_${Math.random().toString(36).slice(2, 10)}`;
  const utms = body?.utms ?? null;
  const consent = Boolean(body?.consent ?? false);
  const now = new Date();
  const seed = Math.random().toString(36).slice(2, 10);
  const totalQuestions = 30;

  try {
    await db
      .insert(testSessions)
      .values({ id: sessionId, utms: utms as any, consent, startedAt: now as any, seed, totalQuestions })
      .onConflictDoNothing();

    return NextResponse.json({ ok: true, sessionId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
