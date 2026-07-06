-- Client consent controls + treatment plan persistence
--
-- 1) Clients can now DECLINE a therapist invite (previously decline was a
--    no-op). DECLINED links behave exactly like REVOKED: no access.
-- AlterEnum
ALTER TYPE "ConsentStatus" ADD VALUE 'DECLINED';

-- 2) Track when a client declined an invite (invitedAt = created_at,
--    respondedAt = granted/declined/revoked timestamp).
-- AlterTable
ALTER TABLE "therapist_clients" ADD COLUMN "consent_declined_at" TIMESTAMP(3);

-- 3) Persist the therapist's therapeutic approach (was dropped by onboarding)
--    and notification preferences (were hardcoded / PATCH was a no-op).
-- AlterTable
ALTER TABLE "therapists" ADD COLUMN "approach" VARCHAR(50);
ALTER TABLE "therapists" ADD COLUMN "preferences" JSONB;

-- 4) Persist treatment plans (previously echoed back and discarded).
--    One plan per therapist/client pair; `plan` holds the full payload
--    (modules, pace, per-module notes, goals).
-- CreateTable
CREATE TABLE "treatment_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "therapist_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "plan" JSONB NOT NULL,
    "approach" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "treatment_plans_therapist_id_client_id_key" ON "treatment_plans"("therapist_id", "client_id");

-- CreateIndex
CREATE INDEX "treatment_plans_therapist_id_idx" ON "treatment_plans"("therapist_id");

-- CreateIndex
CREATE INDEX "treatment_plans_client_id_idx" ON "treatment_plans"("client_id");

-- AddForeignKey
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "therapists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
