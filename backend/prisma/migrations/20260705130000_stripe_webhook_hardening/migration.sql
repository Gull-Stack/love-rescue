-- Stripe webhook hardening: idempotency + out-of-order protection
--
-- 1) webhook_events: one row per processed Stripe event. The primary key IS
--    the Stripe event id (evt_...), so inserting it BEFORE processing turns
--    redelivered events into no-ops (unique constraint = dedupe).
--    payload_summary keeps a tiny audit trail, not the full payload.
-- CreateTable
CREATE TABLE "webhook_events" (
    "id" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload_summary" JSONB,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_events_type_idx" ON "webhook_events"("type");

-- CreateIndex
CREATE INDEX "webhook_events_processed_at_idx" ON "webhook_events"("processed_at");

-- 2) users.last_stripe_event_at: Stripe `created` timestamp of the newest
--    webhook event processed for this user. Stripe does not guarantee
--    delivery order, so the handler skips any event created before this
--    watermark (out-of-order protection).
-- AlterTable
ALTER TABLE "users" ADD COLUMN "last_stripe_event_at" TIMESTAMP(3);
