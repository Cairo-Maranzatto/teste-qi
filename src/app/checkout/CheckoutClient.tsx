"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { track, trackCustom, getFbp, getFbc } from "@/lib/pixel";

export default function CheckoutClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [missingSession, setMissingSession] = useState(false);
  const sessionFromQuery = sp.get("session") || sp.get("sessionId") || "";
  const [isRetest, setIsRetest] = useState(sp.get("retest") === "1");
  const allowForcePaid = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ALLOW_FORCE_PAID === "1";

  useEffect(() => {
    if (!sessionFromQuery) {
      setMissingSession(true);
      toast.error("Sessão ausente", { description: "Inicie o teste para acessar o checkout." });
      const id = setTimeout(() => router.replace("/test/start"), 350);
      return () => clearTimeout(id);
    }
  }, [sessionFromQuery, router]);

  useEffect(() => {
    if (sp.get("retest") === "1") {
      if (!isRetest) setIsRetest(true);
      return;
    }
    try {
      const v = typeof window !== "undefined" ? window.localStorage.getItem("retest") : null;
      const b = v === "1" || v === "true";
      if (b !== isRetest) setIsRetest(b);
    } catch {}
  }, [sp, isRetest]);

  useEffect(() => {
    if (!sessionFromQuery) return;
    try {
      trackCustom("reach_paywall", { session_id: sessionFromQuery, retest: isRetest ? 1 : 0 });
    } catch {}
  }, [sessionFromQuery, isRetest]);

  const handleForcePaidDev = useCallback(async () => {
    try {
      if (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ALLOW_FORCE_PAID !== "1") return;
      const sessionId = sessionFromQuery;
      if (!sessionId) return;
      const res = await fetch("/api/dev/force-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Falha ao forçar pagamento (dev)");
      toast.success("Pagamento forçado (dev)");
      router.replace(`/test/${sessionId}/result?status=success`);
    } catch (e) {
      toast.error("Falha no teste dev", { description: (e as Error).message });
    }
  }, [sessionFromQuery, router]);

  useEffect(() => {
    const status = sp.get("status");
    if (!status) return;
    if (status === "failure") {
      toast.error("Pagamento não aprovado", {
        description: "Tente novamente com outro método de pagamento.",
      });
    } else if (status === "pending") {
      toast("Pagamento pendente", {
        description: "Estamos aguardando a confirmação. Você pode tentar novamente em alguns minutos.",
      });
    }
  }, [sp]);

  useEffect(() => {
    if (!sessionFromQuery) return;
    const st = sp.get("status");
    if (st !== "pending") return;
    let attempts = 0;
    const id = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/payments/status?sessionId=${encodeURIComponent(sessionFromQuery)}`);
        const j = await res.json();
        if (res.ok && (j?.paid || j?.lastPayment?.status === "approved")) {
          toast.success("Pagamento confirmado");
          router.replace(`/test/${sessionFromQuery}/result?status=success`);
        }
      } catch {}
      if (attempts >= 24) {
        clearInterval(id);
      }
    }, 5000);
    return () => {
      clearInterval(id);
    };
  }, [sessionFromQuery, sp, router]);

  const handlePay = useCallback(async () => {
    setLoading(true);
    try {
      const sessionId = sessionFromQuery;
      if (!sessionId) {
        throw new Error("Sessão inválida ou ausente. Volte e inicie o teste novamente.");
      }
      try {
        track("InitiateCheckout", { value: isRetest ? 1.99 : 4.99, currency: "BRL", session_id: sessionId, retest: isRetest ? 1 : 0 });
      } catch {}
      const fbp = getFbp();
      const fbc = getFbc();
      const res = await fetch("/api/payments/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, retest: isRetest, fbp, fbc }),
      });
      const j = await res.json();
      if (!res.ok || !j?.init_point) throw new Error(j?.error || "Falha ao criar preferência");
      window.location.href = j.init_point as string;
    } catch (e) {
      toast.error("Falha no checkout", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [sessionFromQuery, isRetest]);

  const handleCheckStatus = useCallback(async () => {
    try {
      const sessionId = sessionFromQuery;
      if (!sessionId) return;
      const res = await fetch(`/api/payments/status?sessionId=${encodeURIComponent(sessionId)}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Falha ao consultar status");
      if (j?.paid || j?.lastPayment?.status === "approved") {
        toast.success("Pagamento confirmado");
        router.replace(`/test/${sessionId}/result?status=success`);
      } else if (j?.lastPayment?.status === "pending") {
        toast("Pagamento pendente", { description: "Ainda aguardando confirmação do provedor." });
      } else if (j?.lastPayment?.status) {
        toast("Status do pagamento", { description: String(j.lastPayment.status) });
      } else {
        toast("Sem pagamentos encontrados", { description: "Inicie um novo checkout." });
      }
    } catch (e) {
      toast.error("Falha ao consultar status", { description: (e as Error).message });
    }
  }, [sessionFromQuery, router]);

  if (missingSession) {
    return (
      <main className="mx-auto max-w-2xl p-6 md:p-8">
        <div className="mx-auto w-full rounded-xl border p-5 shadow-sm md:max-w-md text-center text-sm text-muted-foreground">
          Redirecionando para iniciar o teste...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6 md:p-8">
      <div className="mx-auto w-full rounded-xl border p-5 shadow-sm md:max-w-md">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl md:text-3xl font-bold">Você foi muito bem!</h1>
          <br />
          <h2 className="text-2xl md:text-2xl font-bold">Veja o seu QI e interpretação completa do seu resultado por apenas</h2>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-2xl md:text-3xl font-extrabold tabular-nums">
            {isRetest ? "R$ 1,99" : "R$ 4,99"}
          </span>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">PIX recomendado</span>
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm md:text-base">
          <li>QI apresentado de forma simples e direta</li>
          <li>Veja como você se posiciona entre outras pessoas</li>
          <li>Entenda sua faixa e receba uma interpretação objetiva</li>
        </ul>
        <div className="mt-1 text-xs text-muted-foreground">Pagamento seguro via Mercado Pago</div>
        <button
          onClick={handlePay}
          disabled={loading}
          className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-black px-4 py-3 text-white disabled:opacity-60"
        >
          {loading
            ? "Redirecionando..."
            : isRetest
            ? "Ver meu resultado completo agora (R$ 1,99)"
            : "Ver meu resultado completo agora (R$ 4,99)"}
        </button>
        {sp.get("status") === "pending" && (
          <button
            type="button"
            onClick={handleCheckStatus}
            className="mt-2 inline-flex w-full items-center justify-center rounded-md border px-4 py-3"
          >
            Verificar status agora
          </button>
        )}
        {allowForcePaid && (
          <button
            type="button"
            onClick={handleForcePaidDev}
            className="mt-2 inline-flex w-full items-center justify-center rounded-md border border-dashed px-4 py-3 text-xs text-muted-foreground"
          >
            [DEV] Marcar como pago (forçar)
          </button>
        )}
        <div className="mt-2 text-center text-xs text-muted-foreground">
          Entretenimento. 16+. Consulte nossa Política de Privacidade.
        </div>
      </div>
    </main>
  );
}
