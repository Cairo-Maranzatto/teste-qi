export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { results } from "@/db/schema/results";
import { rankingOptins } from "@/db/schema/ranking_optins";
import { testSessions } from "@/db/schema/sessions";
import { and, desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db
      .select({
        sessionId: results.sessionId,
        iq: results.iq,
        percentile: results.percentile,
        band: results.band,
        displayName: rankingOptins.displayName,
        finishedAt: results.finishedAt,
      })
      .from(results)
      .innerJoin(rankingOptins, eq(results.sessionId, rankingOptins.sessionId))
      .innerJoin(testSessions, eq(testSessions.id, results.sessionId))
      .where(and(eq(rankingOptins.consent, true), eq(testSessions.paid, true)))
      .orderBy(desc(results.iq), desc(results.createdAt))
      .limit(5);

    return NextResponse.json({ top5: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "failed" }, { status: 500 });
  }
}
