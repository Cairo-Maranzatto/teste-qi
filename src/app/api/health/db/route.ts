export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { pool } from "@/db";

export async function GET() {
  try {
    const r = await pool.query("select now() as now");
    return NextResponse.json({ ok: true, now: r.rows?.[0]?.now ?? null });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
