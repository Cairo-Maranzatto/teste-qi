export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { rankingOptins } from "@/db/schema/ranking_optins";
import { testSessions } from "@/db/schema/sessions";
import { results } from "@/db/schema/results";
import { eq } from "drizzle-orm";

function sanitizeName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const t = input.trim();
  if (!t) return null;
  return t.slice(0, 40);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const sessionId: string | undefined = body?.sessionId;
    const displayName = sanitizeName(body?.displayName);
    if (!sessionId) return NextResponse.json({ error: "sessionId é obrigatório" }, { status: 400 });

    const [sess] = await db.select().from(testSessions).where(eq(testSessions.id, sessionId)).limit(1);
    if (!sess) return NextResponse.json({ error: "Sessão inexistente" }, { status: 404 });
    if (!sess.paid) return NextResponse.json({ error: "Somente sessões pagas podem optar pelo ranking" }, { status: 400 });

    const [res] = await db.select().from(results).where(eq(results.sessionId, sessionId)).limit(1);
    if (!res) return NextResponse.json({ error: "Resultado não encontrado para a sessão" }, { status: 400 });

    const id = `ro_${sessionId}`;
    await db
      .insert(rankingOptins)
      .values({ id, sessionId, displayName: displayName ?? null, consent: true })
      .onConflictDoUpdate({
        target: rankingOptins.sessionId,
        set: { displayName: displayName ?? null, consent: true },
      });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "failed" }, { status: 500 });
  }
}
