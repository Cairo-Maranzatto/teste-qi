import type { Config } from "drizzle-kit";
import { config as loadEnv } from "dotenv";

// Load env from .env.local for CLI usage
loadEnv({ path: ".env.local" });

export default {
  schema: "./src/db/schema/**/*.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
} satisfies Config;
