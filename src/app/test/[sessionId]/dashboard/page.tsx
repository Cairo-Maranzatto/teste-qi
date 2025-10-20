export const runtime = "nodejs";
import { db } from "@/db";
import { results } from "@/db/schema/results";
import { answers } from "@/db/schema/answers";
import { testSessions } from "@/db/schema/sessions";
import { eq } from "drizzle-orm";
import { bandFromIQ } from "@/lib/scoring/bands";
import { getOrderedSelection } from "@/lib/questions/engine";
import Link from "next/link";

export default async function DashboardPage({ params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId;

  const [session] = await db.select().from(testSessions).where(eq(testSessions.id, sessionId)).limit(1);
  if (!session) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-md border p-4 text-sm text-red-600">Sessão não encontrada.</div>
      </main>
    );
  }

  const [res] = await db.select().from(results).where(eq(results.sessionId, sessionId)).limit(1);
  const rows = await db.select().from(answers).where(eq(answers.sessionId, sessionId));

  const totalQuestions = session.totalQuestions ?? 30;
  const seed = session.seed || sessionId;
  const selection = getOrderedSelection(seed, totalQuestions);

  const byIndex = new Map<number, (typeof selection)[number]>();
  selection.forEach((q, i) => byIndex.set(i + 1, q));

  const correct = rows.filter((r) => r.correct).length;
  const skipped = rows.filter((r) => r.skipped).length;
  const wrong = rows.filter((r) => !r.correct && !r.skipped).length;
  const totalAnswered = rows.length;
  const timeMs = rows.reduce((acc, r) => acc + (Number.isFinite(r.timeMs) ? r.timeMs : 0), 0);
  const avgMs = totalAnswered ? Math.round(timeMs / totalAnswered) : 0;

  type Agg = { attempted: number; correct: number; skipped: number };
  const domainAgg = new Map<string, Agg>();
  const diffAgg = new Map<string, Agg>();

  for (const r of rows) {
    const q = byIndex.get(r.qIndex);
    if (!q) continue;
    const d = q.domain;
    const df = q.difficulty;
    const dObj = domainAgg.get(d) || { attempted: 0, correct: 0, skipped: 0 };
    dObj.attempted += 1;
    if (r.correct) dObj.correct += 1;
    if (r.skipped) dObj.skipped += 1;
    domainAgg.set(d, dObj);

    const fObj = diffAgg.get(df) || { attempted: 0, correct: 0, skipped: 0 };
    fObj.attempted += 1;
    if (r.correct) fObj.correct += 1;
    if (r.skipped) fObj.skipped += 1;
    diffAgg.set(df, fObj);
  }

  const bandInfo = res ? bandFromIQ(res.iq) : null;

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard do Resultado</h1>
        <div className="text-xs text-muted-foreground">Sessão: {sessionId}</div>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">QI</div>
          <div className="text-2xl font-bold">{res?.iq ?? "—"}</div>
          <div className="text-xs">Faixa: {bandInfo ? `${bandInfo.band}` : "—"}</div>
        </div>
        <div className="rounded-xl border p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">Percentil</div>
          <div className="text-2xl font-bold">{res?.percentile ?? "—"}</div>
          <div className="text-xs">Pontuação bruta: {res?.rawScore ?? "—"}/{totalQuestions}</div>
        </div>
        <div className="rounded-xl border p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">Status</div>
          <div className="text-2xl font-bold">{session.paid ? "Pago" : "Pendente"}</div>
          <div className="text-xs">Finalizado: {res?.finishedAt ? new Date(res.finishedAt as any).toLocaleString() : "—"}</div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-xl border p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">Acertos</div>
          <div className="text-2xl font-bold">{correct}</div>
        </div>
        <div className="rounded-xl border p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">Erros</div>
          <div className="text-2xl font-bold">{wrong}</div>
        </div>
        <div className="rounded-xl border p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">Puladas</div>
          <div className="text-2xl font-bold">{skipped}</div>
        </div>
        <div className="rounded-xl border p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">Tempo total</div>
          <div className="text-2xl font-bold">{Math.round(timeMs / 1000)}s</div>
          <div className="text-xs">Média: {Math.round(avgMs / 1000)}s/questão</div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Por domínio</h2>
          <div className="mt-2 space-y-2 text-sm">
            {Array.from(domainAgg.entries()).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="capitalize">{k}</span>
                <span>
                  {v.correct}/{v.attempted} corretas{v.skipped ? ` · ${v.skipped} puladas` : ""}
                </span>
              </div>
            ))}
            {!domainAgg.size && <div className="text-muted-foreground">Sem dados</div>}
          </div>
        </div>
        <div className="rounded-xl border p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Por dificuldade</h2>
          <div className="mt-2 space-y-2 text-sm">
            {Array.from(diffAgg.entries()).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="capitalize">{k}</span>
                <span>
                  {v.correct}/{v.attempted} corretas{v.skipped ? ` · ${v.skipped} puladas` : ""}
                </span>
              </div>
            ))}
            {!diffAgg.size && <div className="text-muted-foreground">Sem dados</div>}
          </div>
        </div>
      </section>

      <section className="rounded-xl border p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Resumo</h2>
        <div className="mt-2 text-sm text-muted-foreground">
          Total de questões: {totalQuestions}. Respondidas: {totalAnswered}. Sessão {session.timeoutAutosubmit ? "finalizada por tempo" : "finalizada"}.
        </div>
        <div className="mt-4">
          <Link
            href="/test/start"
            className="inline-flex w-full items-center justify-center rounded-md bg-black px-6 py-3 text-white hover:opacity-90"
          >
            Iniciar um novo teste
          </Link>
        </div>
      </section>
    </main>
  );
}
