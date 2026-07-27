-- Mood-only quick logs are flagged so ratio aggregations (reports, weekly
-- summary, progress rings) can exclude them. Quick logs must never invent
-- positive/negative interaction counts.
ALTER TABLE "daily_logs" ADD COLUMN "quick_log_only" BOOLEAN NOT NULL DEFAULT false;
