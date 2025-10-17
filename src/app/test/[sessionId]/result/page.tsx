export const runtime = "nodejs";
import { db } from "@/db";
import { results } from "@/db/schema/results";
import { eq } from "drizzle-orm";
import { bandFromIQ } from "@/lib/scoring/bands";
import { testSessions } from "@/db/schema/sessions";
import OptInRankingButton from "@/components/OptInRankingButton";
import ShareResultButton from "@/components/ShareResultButton";
import RetestButton from "@/components/RetestButton";
import CheckoutLink from "@/components/CheckoutLink";
import { answers } from "@/db/schema/answers";
import { getOrderedSelection } from "@/lib/questions/engine";
import ViewResultPixel from "@/components/ViewResultPixel";

type Props = { params: { sessionId: string }; searchParams?: { [k: string]: string | string[] | undefined } };

export default async function ResultPage({ params, searchParams }: Props) {
  const sessionId = params.sessionId;
  const allowPreview = process.env.NODE_ENV !== "production";
  const preview = allowPreview && (searchParams?.preview ?? "0") === "1";
  const rawStatus = searchParams?.status;
  const status = Array.isArray(rawStatus) ? rawStatus[0] : rawStatus;
  const [session] = await db.select().from(testSessions).where(eq(testSessions.id, sessionId)).limit(1);
  const isPaid = Boolean(session?.paid);
  const [row] = await db.select().from(results).where(eq(results.sessionId, sessionId)).limit(1);
  const iq = row?.iq ?? null;
  const percentile = row?.percentile ?? null;
  const bandInfo = typeof iq === "number" ? bandFromIQ(iq) : null;
  const ansRows = await db.select().from(answers).where(eq(answers.sessionId, sessionId));
  const totalQuestions = session?.totalQuestions ?? 30;
  const seed = session?.seed || sessionId;
  const selection = getOrderedSelection(seed, totalQuestions);
  const byIndex = new Map<number, (typeof selection)[number]>();
  selection.forEach((q, i) => byIndex.set(i + 1, q));
  const correct = ansRows.filter((r) => r.correct).length;
  const skipped = ansRows.filter((r) => r.skipped).length;
  const wrong = ansRows.filter((r) => !r.correct && !r.skipped).length;
  const totalAnswered = ansRows.length;
  const timeMs = ansRows.reduce((acc, r) => acc + (Number.isFinite(r.timeMs) ? r.timeMs : 0), 0);
  const avgMs = totalAnswered ? Math.round(timeMs / totalAnswered) : 0;
  type Agg = { attempted: number; correct: number; skipped: number };
  const domainAgg = new Map<string, Agg>();
  const diffAgg = new Map<string, Agg>();
  for (const r of ansRows) {
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

  return (
    <main className="mx-auto max-w-md p-6 space-y-4">
      {/* Banners por status de retorno */}
      {status === "success" && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {isPaid ? "Pagamento confirmado. Seu resultado está liberado." : "Pagamento aprovado. Aguardando confirmação (webhook). Atualize em alguns instantes se ainda não visualizar o resultado."}
        </div>
      )}
      {status === "failure" && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Pagamento não aprovado. Tente novamente no checkout.
        </div>
      )}
      {status === "pending" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Pagamento pendente. Assim que confirmado, seu resultado será liberado.
        </div>
      )}
      <div className="rounded-xl border p-5 text-center shadow-sm">
        <h1 className="text-2xl font-bold">Seu Resultado</h1>
        {!isPaid && !preview ? (
          <div className="mt-3 text-sm">
            Seu resultado completo ficará disponível após a confirmação do pagamento.
            <div className="mt-3">
              <CheckoutLink sessionId={sessionId} />
            </div>
          </div>
        ) : iq !== null ? (
          <>
            <ViewResultPixel sessionId={sessionId} iq={iq} percentile={percentile} band={bandInfo ? bandInfo.band : null} isPaid={Boolean(isPaid || preview)} />
            <div className="mt-4 mx-auto grid place-items-center">
              <div
                className="relative grid h-36 w-36 place-items-center rounded-full"
                style={{
                  background:
                    "conic-gradient(var(--color-primary) 0deg, var(--color-primary) 260deg, color-mix(in oklch, var(--color-primary) 30%, transparent) 260deg)",
                }}
              >
                <div className="absolute h-28 w-28 rounded-full bg-background" />
                <span id="result-iq" className="relative z-10 text-3xl font-extrabold tabular-nums">
                  {iq}
                </span>
              </div>
            </div>
            <div className="mt-1 text-sm">Percentil ~<span id="result-percentile">{percentile}</span></div>
            <div id="result-band" className="text-sm">Faixa: {bandInfo?.band} — {bandInfo?.text}</div>
            <div className="mt-4">
              <OptInRankingButton sessionId={sessionId} />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="rounded-xl border p-4 shadow-sm">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-xs text-muted-foreground">Acertos</div>
                    <div className="text-xl font-bold">{correct}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Erros</div>
                    <div className="text-xl font-bold">{wrong}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Puladas</div>
                    <div className="text-xl font-bold">{skipped}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                  <div>
                    <div className="text-xs text-muted-foreground">Tempo total</div>
                    <div className="text-xl font-bold">{Math.round(timeMs / 1000)}s</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Média/questão</div>
                    <div className="text-xl font-bold">{Math.round(avgMs / 1000)}s</div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border p-4 shadow-sm">
                <div className="text-sm font-semibold">Por domínio</div>
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
                <div className="text-sm font-semibold">Por dificuldade</div>
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
              <div className="rounded-xl border p-4 shadow-sm">
                <div className="text-sm font-semibold">Resumo</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Total de questões: {totalQuestions}. Respondidas: {totalAnswered}. Sessão {session?.timeoutAutosubmit ? "finalizada por tempo" : "finalizada"}.
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-2 text-sm text-muted-foreground">
            Resultado ainda não disponível. Se você já pagou, aguarde alguns instantes e atualize a página.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <ShareResultButton sessionId={sessionId} iq={iq} percentile={percentile} bandText={bandInfo ? `${bandInfo.band} — ${bandInfo.text}` : null} />
        <RetestButton />
      </div>
      <div className="text-center text-xs text-muted-foreground">Teste recreativo. Não substitui avaliação clínica.</div>
    </main>
  );
}
