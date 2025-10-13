import { NextResponse } from "next/server";
import { db } from "@/db";
import { testSessions } from "@/db/schema/sessions";
import { eq } from "drizzle-orm";

export async function GET(_req: Request, ctx: { params: { sessionId: string } }) {
  const id = ctx.params.sessionId;
  const rows = await db.select().from(testSessions).where(eq(testSessions.id, id)).limit(1);
  if (!rows.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  const s = rows[0];
  return NextResponse.json({ id: s.id, status: s.status, createdAt: s.createdAt, updatedAt: s.updatedAt });
}
