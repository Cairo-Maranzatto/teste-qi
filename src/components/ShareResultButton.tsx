"use client";

import { toast } from "sonner";

type Props = {
  sessionId: string;
  iq: number | null;
  percentile: number | null;
  bandText?: string | null;
};

export default function ShareResultButton({ sessionId, iq, percentile, bandText }: Props) {
  const handleShare = async () => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/test/${sessionId}/result`;

      const title = "Meu resultado no Teste de QI";
      const textParts = [
        typeof iq === "number" ? `QI: ${iq}` : null,
        typeof percentile === "number" ? `Percentil: ${percentile}` : null,
        bandText ? `Faixa: ${bandText}` : null,
      ].filter(Boolean);
      const text = textParts.join(" · ");

      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard.writeText(`${title}\n${text}\n${url}`);
        toast.success("Link copiado para a área de transferência");
      }
    } catch (e) {
      toast.error("Não foi possível compartilhar", { description: (e as Error).message });
    }
  };

  return (
    <button onClick={handleShare} className="rounded-md border px-4 py-2">Compartilhar</button>
  );
}
