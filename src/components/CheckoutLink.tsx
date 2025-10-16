"use client";

import { MouseEvent, useCallback } from "react";

type Props = { sessionId: string };

export default function CheckoutLink({ sessionId }: Props) {
  const handleClick = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const base = `/checkout?session=${encodeURIComponent(sessionId)}`;
    let url = base;
    try {
      const v = typeof window !== "undefined" ? window.localStorage.getItem("retest") : null;
      if (v === "1") url = `${base}&retest=1`;
    } catch {}
    window.location.assign(url);
  }, [sessionId]);

  return (
    <a href="#" onClick={handleClick} className="inline-flex items-center justify-center rounded-md bg-black px-4 py-3 text-white">
      Ir para o checkout
    </a>
  );
}
