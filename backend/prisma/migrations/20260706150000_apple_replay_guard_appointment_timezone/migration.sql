-- Apple receipt replay guard + appointment timezone.
--
-- users.apple_original_transaction_id: the original_transaction_id of the
--   entitling entry in a validated Apple receipt. UNIQUE so a single purchased
--   receipt can never entitle more than one account (replay across accounts is
--   rejected with 409 APPLE_RECEIPT_IN_USE); the same user re-verifying or
--   restoring simply re-writes their own value.
--
-- appointments.timezone: the IANA timezone the appointment was scheduled in.
--   Appointment emails (scheduled/rescheduled/cancelled/reminder) render times
--   in this zone; when absent they fall back to an explicitly-labelled UTC.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "apple_original_transaction_id" VARCHAR(255);

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "timezone" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "users_apple_original_transaction_id_key" ON "users"("apple_original_transaction_id");
