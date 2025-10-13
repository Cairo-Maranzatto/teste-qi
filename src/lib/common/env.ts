function sanitize(str: string | undefined, def = "") {
  const raw = (str ?? "").trim();
  return raw || def;
}

function sanitizeBaseUrl(str: string | undefined, def = "http://localhost:3000") {
  const raw = (str ?? "").trim();
  const v = raw || def;
  // remove barras finais repetidas (evita //test/...)
  return v.replace(/\/+$/, "");
}

export const env = {
  DATABASE_URL: sanitize(process.env.DATABASE_URL, ""),
  MP_ACCESS_TOKEN: sanitize(process.env.MP_ACCESS_TOKEN, ""),
  MP_WEBHOOK_SECRET: sanitize(process.env.MP_WEBHOOK_SECRET, ""),
  NEXT_PUBLIC_META_PIXEL_ID: sanitize(process.env.NEXT_PUBLIC_META_PIXEL_ID, ""),
  SITE_URL: sanitizeBaseUrl(process.env.SITE_URL, "http://localhost:3000"),
};
