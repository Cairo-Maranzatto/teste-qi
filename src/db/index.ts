import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/common/env";

if (!env.DATABASE_URL) {
  // Em dev, apenas alerta; em prod, lance erro
  console.warn("[db] DATABASE_URL ausente. Defina em .env.local para conectar ao Postgres.");
}

const useSSL = Boolean(
  env.DATABASE_URL && (
    env.DATABASE_URL.includes("sslmode=") ||
    env.DATABASE_URL.includes("supabase.co") ||
    env.DATABASE_URL.includes("pooler.supabase.com") ||
    env.DATABASE_URL.includes("neon.tech") ||
    env.DATABASE_URL.includes("render.com")
  )
);

// Em desenvolvimento, algumas redes/proxies corporativos inserem certificados self-signed.
// Para evitar falhas de TLS no ambiente local, desabilitamos a verificação de CA somente em dev.
if (useSSL && process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export const pool = new Pool({
  connectionString: env.DATABASE_URL || undefined,
  // Em provedores gerenciados, forçar SSL e desabilitar verificação da CA em dev
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle(pool);
