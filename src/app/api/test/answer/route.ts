import { NextResponse } from "next/server";
import { db } from "@/db";
import { answers } from "@/db/schema/answers";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  const sessionId: string | undefined = payload?.sessionId;
  const qIndex: number | undefined = Number(payload?.qIndex);
  const choiceId: string | null = payload?.choiceId ?? null;
  const skipped: boolean = Boolean(payload?.skipped ?? false);
  const timeMs: number = Number(payload?.timeMs ?? 0);
  const correct: boolean = Boolean(payload?.correct ?? false);

  if (!sessionId || !Number.isFinite(qIndex) || qIndex < 1) {
    return NextResponse.json({ error: "sessionId e qIndex são obrigatórios" }, { status: 400 });
  }

  try {
    await db
      .insert(answers)
      .values({
        id: `${sessionId}:${qIndex}`,
        sessionId,
        qIndex,
        choiceId: choiceId ?? null,
        skipped,
        correct,
        timeMs: Number.isFinite(timeMs) && timeMs >= 0 ? timeMs : 0,
      })
      .onConflictDoUpdate({
        target: [answers.sessionId, answers.qIndex],
        set: {
          choiceId: choiceId ?? null,
          skipped,
          correct,
          timeMs: Number.isFinite(timeMs) && timeMs >= 0 ? timeMs : 0,
        },
      });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
