"use client";

import { useEffect, useRef, useState } from "react";

type Movement = "up" | "down" | "new" | "same";
type TopItem = { sessionId: string; displayName: string | null; iq: number; band: string; percentile: number; movement?: Movement };

export default function RankingTop5() {
  const [top5, setTop5] = useState<TopItem[]>([]);
  const lastPositions = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const tick = async () => {
      try {
        const res = await fetch("/api/ranking/top5", { signal: controller.signal, cache: "no-store" });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || "Falha ao carregar ranking");
        const rows: Array<{ sessionId: string; displayName: string | null; iq: number; band: string; percentile: number }> = j?.top5 ?? [];

        // Mapear movimento por sessionId
        const next = rows.map((r, idx) => {
          const prev = lastPositions.current.has(r.sessionId) ? lastPositions.current.get(r.sessionId)! : null;
          let movement: Movement = "same";
          if (prev === null || prev === undefined) movement = "new";
          else if (prev > idx) movement = "up";
          else if (prev < idx) movement = "down";
          return { ...r, movement } as TopItem;
        });

        // Atualizar mapa de posições
        lastPositions.current.clear();
        next.forEach((r, idx) => lastPositions.current.set(r.sessionId, idx));

        if (mounted) setTop5(next);
      } catch (e) {
        // silenciar erros intermitentes
      }
    };

    // Primeiro load e intervalo
    tick();
    const id = setInterval(tick, 3000);
    return () => {
      mounted = false;
      controller.abort();
      clearInterval(id);
    };
  }, []);

  const movementClass = (m?: Movement) =>
    m === "up" ? "text-green-600" : m === "down" ? "text-red-600" : m === "new" ? "text-blue-600" : "text-muted-foreground";

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center gap-3 p-4">
        <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-green-500" aria-hidden="true" />
        <div>
          <div className="text-sm font-medium">Ranking Top 5 (ao vivo)</div>
          <div className="text-xs text-muted-foreground">Apareça aqui se optar pelo ranking no resultado</div>
        </div>
      </div>
      <ul className="divide-y">
        {top5.map((p, i) => (
          <li key={p.sessionId} className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-3">
              <span className="w-6 text-right text-sm text-muted-foreground">{i + 1}º</span>
              <span className="text-sm font-medium">{p.displayName ?? "Anônimo"}</span>
            </div>
            <div className={`text-sm font-semibold tabular-nums ${movementClass(p.movement)}`}>{p.iq}</div>
          </li>
        ))}
        {top5.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted-foreground">Carregando ranking...</li>
        )}
      </ul>
    </div>
  );
}
