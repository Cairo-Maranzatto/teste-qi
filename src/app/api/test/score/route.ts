import { NextResponse } from "next/server";
import { db } from "@/db";
import { answers } from "@/db/schema/answers";
import { eq } from "drizzle-orm";
import { computeRawScore, computeIQ, computePercentile } from "@/lib/scoring/algorithm";
import { bandFromIQ } from "@/lib/scoring/bands";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const sessionId: string | undefined = body?.sessionId;
  if (!sessionId) return NextResponse.json({ error: "sessionId é obrigatório" }, { status: 400 });

  try {
    const rows = await db.select().from(answers).where(eq(answers.sessionId, sessionId));
    const raw = computeRawScore(rows.map((r) => ({ correct: r.correct })));
    const iq = computeIQ(raw);
    const percentile = computePercentile(iq);
    const { band } = bandFromIQ(iq);
    return NextResponse.json({ ok: true, rawScore: raw, iq, percentile, band });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
