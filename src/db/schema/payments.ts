import { pgTable, text, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { testSessions } from "./sessions";

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => testSessions.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("mercadopago"),
    providerPaymentId: text("provider_payment_id"),
    preferenceId: text("preference_id"),
    externalReference: text("external_reference"),
    payerEmail: text("payer_email"),
    amountCents: integer("amount_cents").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => {
    return {
      sessionIdx: index("payments_session_idx").on(table.sessionId),
      statusIdx: index("payments_status_idx").on(table.status),
      providerPaymentUniq: uniqueIndex("payments_provider_payment_uniq").on(table.providerPaymentId),
      preferenceUniq: uniqueIndex("payments_preference_uniq").on(table.preferenceId),
    };
  }
);
