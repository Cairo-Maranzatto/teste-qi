"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function PixelInitClient() {
  const [consent, setConsent] = useState<string | null>(null);
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
  const pathname = usePathname();

  useEffect(() => {
    try {
      const v = window.localStorage.getItem("analytics_consent");
      setConsent(v);
    } catch {}
  }, []);

  if (!pixelId) return null;

  if (consent !== "granted") {
    return (
      <div className="fixed bottom-0 inset-x-0 z-50 bg-black/90 text-white text-sm p-3 flex flex-col md:flex-row items-center justify-center gap-3">
        <span>Usamos cookies para analytics. Você aceita?</span>
        <div className="flex gap-2">
          <button
            onClick={() => {
              try {
                window.localStorage.setItem("analytics_consent", "granted");
              } catch {}
              setConsent("granted");
            }}
            className="px-3 py-2 bg-white text-black rounded"
          >
            Aceitar
          </button>
          <button
            onClick={() => {
              try {
                window.localStorage.setItem("analytics_consent", "denied");
              } catch {}
              setConsent("denied");
            }}
            className="px-3 py-2 border border-white rounded"
          >
            Recusar
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    try {
      const w: any = window as any;
      if (typeof w.fbq === "function") {
        w.fbq("track", "PageView");
      }
    } catch {}
  }, [pathname]);

  return (
    <>
      <Script id="fb-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('consent', 'grant');
          fbq('track', 'PageView');
        `}
      </Script>
    </>
  );
}
