-- Real Talk Live Session — in-session listener that flags fallacies,
-- manipulative tactics, and Gottman horsemen in real time.
--
-- Privacy-first storage: `flag_counts` (per-pattern totals) and
-- `flagged_excerpts` (only the sentences that triggered a flag, capped by the
-- route layer) are persisted. The full conversation transcript is NEVER
-- stored; audio never reaches the server at all (speech-to-text happens in
-- the client's browser).

-- CreateTable
CREATE TABLE "live_talk_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "utterance_count" INTEGER NOT NULL DEFAULT 0,
    "flag_counts" JSONB NOT NULL DEFAULT '{}',
    "flagged_excerpts" JSONB NOT NULL DEFAULT '[]',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_talk_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "live_talk_sessions_user_id_deleted_at_idx" ON "live_talk_sessions"("user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "live_talk_sessions_created_at_idx" ON "live_talk_sessions"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "live_talk_sessions" ADD CONSTRAINT "live_talk_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
