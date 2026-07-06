-- Security hardening migration
--
-- 1) Session revocation: per-user token version embedded in access JWTs.
--    Incremented on password change/reset and logout to invalidate all
--    outstanding access tokens for the user.
ALTER TABLE "users" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;

-- 2) DB-backed brute-force lockout fallback (used when REDIS_URL is unset).
--    Same policy as the Redis path: 5 failed attempts / 15-minute lockout.
ALTER TABLE "users" ADD COLUMN "failed_login_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "last_failed_login_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "locked_until" TIMESTAMP(3);

-- 3) Track explicit admin demotion so the boot-time platform-admin bootstrap
--    never re-promotes an account an operator demoted.
ALTER TABLE "users" ADD COLUMN "admin_revoked_at" TIMESTAMP(3);

-- 4) Per-code attempt counter for password reset codes (invalidated after 5
--    failed verification attempts).
ALTER TABLE "tokens" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- 5) Bind integration partners to the specific therapists they may act for.
--    POST /api/integration/auth fails closed for partners with no bindings.
-- CreateTable
CREATE TABLE "integration_partner_therapists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partner_id" UUID NOT NULL,
    "therapist_id" UUID NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_partner_therapists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integration_partner_therapists_partner_id_therapist_id_key" ON "integration_partner_therapists"("partner_id", "therapist_id");

-- CreateIndex
CREATE INDEX "integration_partner_therapists_partner_id_idx" ON "integration_partner_therapists"("partner_id");

-- CreateIndex
CREATE INDEX "integration_partner_therapists_therapist_id_idx" ON "integration_partner_therapists"("therapist_id");

-- AddForeignKey
ALTER TABLE "integration_partner_therapists" ADD CONSTRAINT "integration_partner_therapists_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "integration_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_partner_therapists" ADD CONSTRAINT "integration_partner_therapists_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "therapists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
