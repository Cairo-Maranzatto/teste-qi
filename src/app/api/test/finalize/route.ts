import { NextResponse } from "next/server";
import { db } from "@/db";
import { answers } from "@/db/schema/answers";
import { results } from "@/db/schema/results";
import { testSessions } from "@/db/schema/sessions";
import { eq } from "drizzle-orm";
import { computeRawScore, computeIQ, computePercentile } from "@/lib/scoring/algorithm";
import { bandFromIQ } from "@/lib/scoring/bands";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const sessionId: string | undefined = body?.sessionId;
  const autosubmitted: boolean = Boolean(body?.autosubmitted ?? false);
  if (!sessionId) return NextResponse.json({ error: "sessionId é obrigatório" }, { status: 400 });

  try {
    const rows = await db.select().from(answers).where(eq(answers.sessionId, sessionId));
    const raw = computeRawScore(rows.map((r) => ({ correct: r.correct })));
    const iq = computeIQ(raw);
    const percentile = computePercentile(iq);
    const { band } = bandFromIQ(iq);
    const now = new Date();

    // Upsert resultado (único por sessão)
    await db
      .insert(results)
      .values({
        id: `res_${sessionId}`,
        sessionId,
        rawScore: raw,
        iq,
        percentile,
        band,
        autosubmitted,
        finishedAt: now as any,
      })
      .onConflictDoUpdate({
        target: [results.sessionId],
        set: { rawScore: raw, iq, percentile, band, autosubmitted, finishedAt: now as any },
      });

    // Marcar sessão como finalizada
    await db.update(testSessions).set({ finishedAt: now as any, timeoutAutosubmit: autosubmitted }).where(eq(testSessions.id, sessionId));

    return NextResponse.json({ ok: true, result: { rawScore: raw, iq, percentile, band, autosubmitted, finishedAt: now } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
