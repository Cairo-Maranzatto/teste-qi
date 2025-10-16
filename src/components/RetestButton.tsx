"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function RetestButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRetest = async () => {
    setLoading(true);
    try {
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("retest", "1");
        } catch {}
      }
      const res = await fetch("/api/test/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utms: null, consent: false }),
      });
      const j = await res.json();
      if (!res.ok || !j?.sessionId) throw new Error(j?.error || "Falha ao criar nova sessão");
      router.push(`/test/${j.sessionId}/question/1`);
    } catch (e) {
      toast.error("Não foi possível iniciar o reteste", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleRetest} disabled={loading} className="inline-flex items-center justify-center rounded-md bg-black px-4 py-3 text-white disabled:opacity-60">
      {loading ? "Iniciando..." : "Refazer por R$ 2,00"}
    </button>
  );
}
