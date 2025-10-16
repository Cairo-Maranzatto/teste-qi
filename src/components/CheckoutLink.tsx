"use client";

import { useEffect, useMemo, useState } from "react";

type Props = { sessionId: string };

export default function CheckoutLink({ sessionId }: Props) {
  const [retestFlag, setRetestFlag] = useState(false);

  useEffect(() => {
    try {
      const v = typeof window !== "undefined" ? window.localStorage.getItem("retest") : null;
      setRetestFlag(v === "1");
    } catch {}
  }, []);

  const href = useMemo(() => {
    const base = `/checkout?session=${encodeURIComponent(sessionId)}`;
    return retestFlag ? `${base}&retest=1` : base;
  }, [sessionId, retestFlag]);

  return (
    <a href={href} className="inline-flex items-center justify-center rounded-md bg-black px-4 py-3 text-white">
      Ir para o checkout
    </a>
  );
}
