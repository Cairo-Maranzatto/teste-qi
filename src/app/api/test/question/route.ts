export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { testSessions } from "@/db/schema/sessions";
import { eq } from "drizzle-orm";
import { getQuestionByIndex } from "@/lib/questions/engine";
import { seededShuffle } from "@/lib/random";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId") || undefined;
  const indexStr = searchParams.get("index");
  const index = Number(indexStr);

  if (!sessionId || !Number.isFinite(index) || index < 1) {
    return NextResponse.json({ error: "sessionId e index são obrigatórios" }, { status: 400 });
  }

  try {
    const rows = await db.select().from(testSessions).where(eq(testSessions.id, sessionId)).limit(1);
    if (!rows.length) return NextResponse.json({ error: "sessão não encontrada" }, { status: 404 });
    const s = rows[0];
    const seed = s.seed || sessionId;
    const total = s.totalQuestions ?? 30;

    const q = getQuestionByIndex(seed, index, total);
    if (!q) return NextResponse.json({ error: "questão não encontrada" }, { status: 404 });

    return NextResponse.json({
      id: q.id,
      stem: q.stem,
      // embaralhar opções de forma determinística por sessão/índice
      options: seededShuffle(q.options, `${seed}|${q.id}|${index}`).map((o) => ({ id: o.id, label: o.label })),
      meta: { domain: q.domain, difficulty: q.difficulty, type: q.type, timeTargetSec: q.timeTargetSec },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
