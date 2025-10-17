"use client";

import { useEffect } from "react";
import { trackCustom } from "@/lib/pixel";

type Props = {
  sessionId: string;
  iq: number | null;
  percentile: number | null;
  band: string | null;
  isPaid: boolean;
};

export default function ViewResultPixel({ sessionId, iq, percentile, band, isPaid }: Props) {
  useEffect(() => {
    if (!isPaid || iq === null) return;
    try {
      trackCustom("view_result", {
        session_id: sessionId,
        iq,
        percentile,
        band,
      });
    } catch {}
  }, [isPaid, iq, percentile, band, sessionId]);

  return null;
}
