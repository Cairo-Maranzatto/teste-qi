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
