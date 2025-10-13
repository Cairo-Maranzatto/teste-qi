import { NextResponse } from "next/server";

const sample = [
  { name: "A. Silva (SP)", iq: 132 },
  { name: "B. Santos (RJ)", iq: 128 },
  { name: "C. Oliveira (MG)", iq: 121 },
  { name: "D. Souza (PR)", iq: 118 },
  { name: "E. Lima (RS)", iq: 115 },
];

export async function GET() {
  return NextResponse.json({ top5: sample });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return NextResponse.json({ ok: true, optin: body ?? null });
}
