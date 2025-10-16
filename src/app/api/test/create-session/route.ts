export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { testSessions } from "@/db/schema/sessions";
import { sql } from "drizzle-orm";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const sessionId: string = body?.sessionId || `sess_${Math.random().toString(36).slice(2, 10)}`;
  const utms = body?.utms ?? null;
  const consent = Boolean(body?.consent ?? false);
  const seed = Math.random().toString(36).slice(2, 10);
  const totalQuestions = 30;

  try {
    const values: any = { id: sessionId, consent, startedAt: sql`now()`, seed, totalQuestions };
    if (utms && typeof utms === "object") values.utms = utms;
    await db.insert(testSessions).values(values).onConflictDoNothing();

    return NextResponse.json({ ok: true, sessionId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
