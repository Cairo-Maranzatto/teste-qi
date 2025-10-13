import { pgTable, text, timestamp, boolean, jsonb, integer, index } from "drizzle-orm/pg-core";

export const testSessions = pgTable(
  "test_sessions",
  {
    id: text("id").primaryKey(), // gerado na app como "sess_xxx"
    status: text("status").notNull().default("active"),
    utms: jsonb("utms"),
    consent: boolean("consent").notNull().default(false),
    // Controle do fluxo do teste
    seed: text("seed"),
    totalQuestions: integer("total_questions").notNull().default(30),
    startedAt: timestamp("started_at", { withTimezone: false }),
    finishedAt: timestamp("finished_at", { withTimezone: false }),
    paid: boolean("paid").notNull().default(false),
    timeoutAutosubmit: boolean("timeout_autosubmit").notNull().default(false),
    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => {
    return {
      statusIdx: index("test_sessions_status_idx").on(table.status),
      createdIdx: index("test_sessions_created_idx").on(table.createdAt),
    };
  }
);
