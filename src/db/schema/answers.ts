import { pgTable, text, integer, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { testSessions } from "./sessions";

export const answers = pgTable(
  "answers",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => testSessions.id, { onDelete: "cascade" }),
    qIndex: integer("q_index").notNull(),
    choiceId: text("choice_id"),
    skipped: boolean("skipped").notNull().default(false),
    correct: boolean("correct").notNull().default(false),
    timeMs: integer("time_ms").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => {
    return {
      sessionIdx: index("answers_session_idx").on(table.sessionId),
      sessionQIdxUniq: uniqueIndex("answers_session_qindex_uniq").on(table.sessionId, table.qIndex),
    };
  }
);
