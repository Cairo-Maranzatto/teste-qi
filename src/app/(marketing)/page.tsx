"use client";
import Link from "next/link";
import RankingTop5 from "@/components/RankingTop5";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl p-6 md:p-8">
      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        {/* Coluna esquerda: hero + KPIs + CTA */}
        <section className="space-y-4">
          <h1 className="text-center text-3xl font-bold leading-tight md:text-4xl">
            Descubra o seu QI
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Responda 30 questões rápidas. Veja seu número de QI, percentil e interpretação.
          </p>
          <div className="grid grid-cols-1 gap-2">
            <div className="rounded-lg border p-3 text-sm md:text-base">Rápido e simples (30 questões)</div>
            <div className="rounded-lg border p-3 text-sm md:text-base">Resultado com número de QI e métricas</div>
            <div className="rounded-lg border p-3 text-sm md:text-base">Compartilhe seu resultado</div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="rounded-lg border p-3 text-center">
              <div className="text-base font-semibold md:text-lg">15 min</div>
              <div className="text-xs text-muted-foreground">Tempo total</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-base font-semibold md:text-lg">4.8/5</div>
              <div className="text-xs text-muted-foreground">Avaliações</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-base font-semibold md:text-lg">Acessibilidade</div>
              <div className="text-xs text-muted-foreground">Experiência</div>
            </div>
          </div>
          <div className="space-y-2">
            <Link
              href="/test/start"
              className="inline-flex w-full items-center justify-center rounded-md bg-black px-4 py-3 text-white hover:opacity-90 md:max-w-sm"
            >
              Iniciar teste agora
            </Link>
            <div className="text-center text-xs text-muted-foreground md:text-left">
              Conteúdo de entretenimento. Indicado para maiores de 16 anos.
            </div>
          </div>
        </section>

        {/* Coluna direita: Ranking Top 5 ao vivo */}
        <section>
          <RankingTop5 />
        </section>
      </div>
    </main>
  );
}
