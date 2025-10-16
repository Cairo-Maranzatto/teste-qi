"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function OptInRankingButton({ sessionId }: { sessionId: string }) {
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const router = useRouter();

  const handleOptIn = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ranking/opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, displayName: displayName.trim() || null }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Falha ao entrar no ranking");
      toast.success("Opt-in registrado!", { description: "Você poderá aparecer no Top 5." });
      // Redirecionar para a home (ranking visível)
      router.replace("/");
    } catch (e) {
      toast.error("Não foi possível registrar o opt-in", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      <input
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        maxLength={40}
        placeholder="Nome para exibição (opcional)"
        className="w-full rounded-md border px-3 py-2 text-sm"
      />
      <button onClick={handleOptIn} disabled={loading} className="rounded-md border px-4 py-2 text-sm disabled:opacity-60">
        {loading ? "Enviando..." : "Enviar"}
      </button>
    </div>
  );
}

