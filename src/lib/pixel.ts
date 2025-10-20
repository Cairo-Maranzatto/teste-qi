function hasConsent() {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem("analytics_consent") === "granted";
  } catch {
    return false;
  }
}

function getFbq(): ((...args: any[]) => void) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  if (typeof w.fbq !== "function") return null;
  return w.fbq as (...args: any[]) => void;
}

export function track(event: string, params?: Record<string, any>) {
  if (!hasConsent()) return false;
  const fbq = getFbq();
  if (!fbq) return false;
  if (params) fbq("track", event, params);
  else fbq("track", event);
  return true;
}

export function trackCustom(event: string, params?: Record<string, any>) {
  if (!hasConsent()) return false;
  const fbq = getFbq();
  if (!fbq) return false;
  if (params) fbq("trackCustom", event, params);
  else fbq("trackCustom", event);
  return true;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, "\\$1") + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

export function getFbp(): string | null {
  if (!hasConsent()) return null;
  return readCookie("_fbp");
}

export function getFbc(): string | null {
  if (!hasConsent()) return null;
  const c = readCookie("_fbc");
  if (c) return c;
  try {
    if (typeof window === "undefined") return null;
    const url = new URL(window.location.href);
    const fbclid = url.searchParams.get("fbclid");
    if (!fbclid) return null;
    const ts = Math.floor(Date.now() / 1000);
    return `fb.1.${ts}.${fbclid}`;
  } catch {
    return null;
  }
}
