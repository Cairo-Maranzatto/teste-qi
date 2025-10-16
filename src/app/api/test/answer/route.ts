import { NextResponse } from "next/server";
export const runtime = "nodejs";
import { db } from "@/db";
import { answers } from "@/db/schema/answers";
import { eq } from "drizzle-orm";
import { testSessions } from "@/db/schema/sessions";
import { getQuestionByIndex } from "@/lib/questions/engine";

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  const sessionId: string | undefined = payload?.sessionId;
  const qIndex: number | undefined = Number(payload?.qIndex);
  const choiceId: string | null = payload?.choiceId ?? null;
  const skipped: boolean = Boolean(payload?.skipped ?? false);
  const timeMs: number = Number(payload?.timeMs ?? 0);

  if (!sessionId || !Number.isFinite(qIndex) || qIndex < 1) {
    return NextResponse.json({ error: "sessionId e qIndex são obrigatórios" }, { status: 400 });
  }

  try {
    // Buscar seed e total da sessão para determinar a questão e validar a resposta
    const srows = await db.select().from(testSessions).where(eq(testSessions.id, sessionId)).limit(1);
    if (!srows.length) return NextResponse.json({ error: "sessão não encontrada" }, { status: 404 });
    const s = srows[0];
    const seed = s.seed || sessionId;
    const total = s.totalQuestions ?? 30;

    const q = getQuestionByIndex(seed, qIndex, total);
    const correct = !skipped && !!choiceId && q ? q.correctId === choiceId : false;

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

