"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function StartClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const [loading, setLoading] = useState(false);

  const utms = useMemo(() => {
    const obj: Record<string, string> = {};
    sp.forEach((v, k) => {
      if (k.toLowerCase().startsWith("utm_")) obj[k] = v;
    });
    return Object.keys(obj).length ? obj : null;
  }, [sp]);

  const handleStart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/test/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utms, consent: false }),
      });
      const j = await res.json();
      if (!res.ok || !j?.sessionId) throw new Error(j?.error || "Falha ao criar sessão");
      router.push(`/test/${j.sessionId}/question/1`);
    } catch (e) {
      toast.error("Não foi possível iniciar o teste", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [router, utms]);

  return (
    <main className="mx-auto max-w-2xl p-6 md:p-8 space-y-4">
      <h1 className="text-2xl md:text-3xl font-bold">Como funciona</h1>
      <ul className="list-disc pl-6 text-sm md:text-base text-muted-foreground space-y-1">
        <li>30 questões de múltipla escolha (4 alternativas, 1 correta)</li>
        <li>Tempo total: 15:00 (+30s para concluir a questão atual)</li>
        <li>Não é possível voltar nas questões já respondidas</li>
        <li>“Pular” conta como errado (desabilitado nos últimos 10s)</li>
      </ul>
      <div className="text-sm md:text-base text-muted-foreground">
        Questões curtas. Muitas pessoas se surpreendem positivamente com seus resultados.
      </div>

      <button
        onClick={handleStart}
        disabled={loading}
        className="inline-flex w-full md:w-auto items-center justify-center rounded-md bg-black px-6 py-3 text-white hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Iniciando..." : "Começar agora"}
      </button>
      <div className="text-center text-xs text-muted-foreground">Conteúdo de entretenimento. 16+.</div>
    </main>
  );
}
