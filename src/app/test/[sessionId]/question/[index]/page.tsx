"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
type Params = { params: Promise<{ sessionId: string; index: string }> };

export default function QuestionPage({ params }: Params) {
  const { sessionId, index } = use(params);
  const router = useRouter();
  const totalQuestions = 30;
  const qIndex = useMemo(() => Math.max(1, Math.min(totalQuestions, Number(index) || 1)), [index]);
  const [selected, setSelected] = useState<string | null>(null);
  // Timer: 15 minutos (900s), persistente por sessão
  const DURATION = 900; // segundos
  const storageKey = `test_timer_start_${sessionId}`;
  const [remaining, setRemaining] = useState<number>(DURATION);
  const [timedOut, setTimedOut] = useState(false);
  const redirectScheduled = useRef(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const skipHintId = useMemo(() => `skip-disabled-hint-${sessionId}-${qIndex}`, [sessionId, qIndex]);
  const [navMessage, setNavMessage] = useState<string>("Carregando...");
  const progressKey = useMemo(() => `test_max_index_${sessionId}`, [sessionId]);
  const reportElapsedMs = useMemo(() => (DURATION - remaining) * 1000, [remaining]);
  type Option = { id: string; label: string };
  type QuestionDTO = {
    id: string;
    stem: string;
    options: Option[];
    meta: { domain: string; difficulty: string; type: string; timeTargetSec: number };
  };
  const [q, setQ] = useState<QuestionDTO | null>(null);
  const [qLoading, setQLoading] = useState<boolean>(true);
  
  useEffect(() => {
    // Inicializa startTime se não existir
    const now = Date.now();
    const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(storageKey) : null;
    let start = raw ? Number(raw) : NaN;
    if (!raw || !Number.isFinite(start)) {
      start = now;
      try {
        window.sessionStorage.setItem(storageKey, String(start));
      } catch {}
    }
    const tick = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const rem = Math.max(0, DURATION - elapsed);
      setRemaining(rem);
      if (rem <= 0 && !redirectScheduled.current) {
        // Exibir overlay e agendar redirecionamento
        redirectScheduled.current = true;
        setTimedOut(true);
        // Tentar finalizar sessão por timeout (não bloqueante)
        try {
          const payload = JSON.stringify({ sessionId, autosubmitted: true });
          if (navigator.sendBeacon) {
            navigator.sendBeacon("/api/test/finalize", new Blob([payload], { type: "application/json" }));
          } else {
            fetch("/api/test/finalize", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
          }
        } catch {}
        setTimeout(() => {
          router.replace(`/checkout?session=${sessionId}`);
        }, 1200);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Interceptar back/forward do navegador para evitar regressão
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      // Evitar regressão no fluxo: manter usuário na questão atual
      try { history.forward(); } catch {}
      // Reforça a rota atual
      router.replace(`/test/${sessionId}/question/${qIndex}`);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [router, sessionId, qIndex]);

  // Aviso ao tentar sair/recarregar a página durante o teste
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ""; // Alguns navegadores usam string vazia para exibir o prompt padrão
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Guarda anti-regressão por índice: impede voltar para questões anteriores
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(progressKey) : null;
      let maxIdx = raw ? Number(raw) : NaN;
      if (!Number.isFinite(maxIdx) || maxIdx < 1) {
        maxIdx = qIndex;
        window.sessionStorage.setItem(progressKey, String(maxIdx));
        return;
      }
      if (qIndex < maxIdx) {
        toast.error("Navegação bloqueada", { description: "Você não pode voltar para questões anteriores." });
        setIsNavigating(true);
        setNavMessage("Mantendo seu progresso...");
        router.replace(`/test/${sessionId}/question/${maxIdx}`);
        return;
      }
      if (qIndex > maxIdx) {
        window.sessionStorage.setItem(progressKey, String(qIndex));
      }
    } catch {}
  }, [qIndex, progressKey, router, sessionId]);
 
  // Carregar questão real do servidor
  useEffect(() => {
    let cancelled = false;
    setQLoading(true);
    setQ(null);
    setSelected(null);
    (async () => {
      try {
        const res = await fetch(`/api/test/question?sessionId=${sessionId}&index=${qIndex}`, { cache: "no-store" });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || "Falha ao carregar a questão");
        if (!cancelled) setQ(j as QuestionDTO);
      } catch (e) {
        if (!cancelled) {
          toast.error("Não foi possível carregar a questão", { description: (e as Error).message });
        }
      } finally {
        if (!cancelled) setQLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, qIndex]);
  
  const timeText = useMemo(() => {
    const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
    const ss = String(remaining % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [remaining]);
  
  const qProgressPct = useMemo(() => ((qIndex - 1) / totalQuestions) * 100, [qIndex]);
  const timeProgressPct = useMemo(() => (remaining / DURATION) * 100, [remaining]);
  
  const goNext = () => {
    const next = qIndex + 1;
    if (next > totalQuestions) {
      // Finaliza sessão (não bloqueante) antes do redirect para o checkout
      try {
        const payload = JSON.stringify({ sessionId, autosubmitted: false });
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/test/finalize", new Blob([payload], { type: "application/json" }));
        } else {
          fetch("/api/test/finalize", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
        }
      } catch {}
      router.push(`/checkout?session=${sessionId}`);
    }
    else router.push(`/test/${sessionId}/question/${next}`);
  };
  const fireAndForgetAnswer = (skipped: boolean) => {
    try {
      const payload = {
        sessionId,
        qIndex,
        choiceId: skipped ? null : selected,
        skipped,
        timeMs: reportElapsedMs,
      };
      const json = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/test/answer", new Blob([json], { type: "application/json" }));
      } else {
        fetch("/api/test/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: json, keepalive: true }).catch(() => {});
      }
    } catch {}
  };

  const handleSkip = () => {
    setIsNavigating(true);
    setNavMessage("Avançando...");
    fireAndForgetAnswer(true);
    goNext();
  };
  const handleAnswer = () => {
    // Placeholder: poderia chamar /api/test/answer
    setIsNavigating(true);
    setNavMessage("Enviando resposta...");
    fireAndForgetAnswer(false);
    goNext();
  };
  
  return (
    <main className="mx-auto max-w-3xl p-0 md:p-4">
      {/* Topbar: progresso e tempo */}
      <div className="sticky top-0 z-10 border-b bg-background p-4 md:rounded-lg md:border">
        <div className="flex items-center justify-between text-sm md:text-base">
          <span>
            Questão {qIndex} de {totalQuestions}
          </span>
          <span className="text-muted-foreground">Tempo restante: {timeText}</span>
        </div>
        <div className="mt-2 space-y-2">
          <div className="h-2 w-full overflow-hidden rounded bg-muted">
            <div className="h-2 bg-foreground" style={{ width: `${qProgressPct}%` }} />
          </div>
          <div className="h-2 w-full overflow-hidden rounded bg-muted">
            <div className="h-2 bg-primary" style={{ width: `${timeProgressPct}%` }} />
          </div>
        </div>
      </div>

      {/* Card da questão */}
      <div className="p-4">
        <div className="rounded-xl border p-4 shadow-sm">
          <h1 className="mt-1 text-xl font-bold">Questão {qIndex}</h1>
          <div id="question-stem" className="mt-2 text-sm">
            {qLoading ? "Carregando…" : q?.stem || "—"}
          </div>
          {/* Imagem da questão (quando type === "image") */}
          {q && q.meta.type === "image" && (
            <div className="mt-3">
              <img
                src={`/images/${q.id}.png`}
                alt={`Questão ${q.id}`}
                className="mx-auto max-h-[360px] w-auto rounded-md border object-contain"
                loading="eager"
              />
            </div>
          )}
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2" role="group" aria-label="Alternativas">
            {(q?.options ?? []).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelected(opt.id)}
                aria-pressed={selected === opt.id}
                className={`w-full rounded-md border px-3 py-2 text-left hover:bg-muted ${
                  selected === opt.id ? "ring-2 ring-ring" : ""
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleAnswer}
              disabled={!selected || isNavigating || qLoading}
              className="rounded-md bg-black px-4 py-2 text-white hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Responder
            </button>
            <button
              onClick={handleSkip}
              disabled={remaining <= 10 || isNavigating}
              aria-describedby={remaining <= 10 ? skipHintId : undefined}
              className="rounded-md border px-4 py-2 hover:bg-muted cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Pular
            </button>
          </div>
          {remaining <= 10 && (
            <div id={skipHintId} className="mt-2 text-xs text-muted-foreground">
              “Pular” fica indisponível nos últimos 10 segundos do teste.
            </div>
          )}
          <div className="mt-2 text-xs text-muted-foreground">
            Use Tab/Shift+Tab para alternar; Enter para confirmar.
          </div>
        </div>
      </div>
      {/* Overlay de timeout/loading navegação */}
      {(timedOut || isNavigating) && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
          <div className="rounded-xl border bg-background p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-foreground" aria-hidden="true" />
              <div className="text-sm">
                {timedOut ? "Tempo esgotado. Finalizando suas respostas..." : navMessage}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
