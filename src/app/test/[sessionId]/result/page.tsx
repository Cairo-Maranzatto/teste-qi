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
