import { pgTable, text, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { testSessions } from "./sessions";

export const rankingOptins = pgTable(
  "ranking_optins",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => testSessions.id, { onDelete: "cascade" }),
    displayName: text("display_name"), // ex.: "A. Silva (SP)"
    consent: boolean("consent").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => {
    return {
      sessionUniq: uniqueIndex("ranking_optins_session_uniq").on(table.sessionId),
    };
  }
);
