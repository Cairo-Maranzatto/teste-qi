ALTER TABLE "answers" ADD COLUMN "skipped" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "preference_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "external_reference" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payer_email" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "results" ADD COLUMN "raw_score" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "results" ADD COLUMN "autosubmitted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "results" ADD COLUMN "finished_at" timestamp;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD COLUMN "seed" text;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD COLUMN "total_questions" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD COLUMN "finished_at" timestamp;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD COLUMN "paid" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD COLUMN "timeout_autosubmit" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_session_id_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_session_id_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_optins" ADD CONSTRAINT "ranking_optins_session_id_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_session_id_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "answers_session_idx" ON "answers" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "answers_session_qindex_uniq" ON "answers" USING btree ("session_id","q_index");--> statement-breakpoint
CREATE INDEX "payments_session_idx" ON "payments" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_payment_uniq" ON "payments" USING btree ("provider_payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_preference_uniq" ON "payments" USING btree ("preference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ranking_optins_session_uniq" ON "ranking_optins" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "results_session_uniq" ON "results" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "test_sessions_status_idx" ON "test_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "test_sessions_created_idx" ON "test_sessions" USING btree ("created_at");