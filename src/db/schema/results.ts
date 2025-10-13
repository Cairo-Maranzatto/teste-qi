import { pgTable, text, integer, timestamp, uniqueIndex, boolean } from "drizzle-orm/pg-core";
import { testSessions } from "./sessions";

export const results = pgTable(
  "results",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => testSessions.id, { onDelete: "cascade" }),
    rawScore: integer("raw_score").notNull(),
    iq: integer("iq").notNull(),
    percentile: integer("percentile").notNull(),
    band: text("band").notNull(),
    autosubmitted: boolean("autosubmitted").notNull().default(false),
    finishedAt: timestamp("finished_at", { withTimezone: false }),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => {
    return {
      sessionUniq: uniqueIndex("results_session_uniq").on(table.sessionId),
    };
  }
);
