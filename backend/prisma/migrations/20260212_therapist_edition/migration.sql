-- CreateEnum
CREATE TYPE "PermissionLevel" AS ENUM ('BASIC', 'STANDARD', 'FULL');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('PENDING', 'GRANTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('CRISIS', 'RISK', 'MILESTONE', 'STAGNATION');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IntegrationPartnerStatus" AS ENUM ('active', 'suspended', 'revoked');

-- CreateTable
CREATE TABLE "therapist_clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "therapist_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "couple_id" UUID,
    "invite_code" VARCHAR(50),
    "consent_status" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
    "consent_granted_at" TIMESTAMP(3),
    "consent_revoked_at" TIMESTAMP(3),
    "permission_level" "PermissionLevel" NOT NULL DEFAULT 'BASIC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapist_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapist_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "therapist_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "alert_type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "therapist_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_prep_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "therapist_id" UUID NOT NULL,
    "client_id" UUID,
    "couple_id" UUID,
    "report_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_session_date" TIMESTAMP(3),
    "activities_completed" JSONB NOT NULL DEFAULT '[]',
    "assessment_changes" JSONB NOT NULL DEFAULT '{}',
    "mood_trends" JSONB NOT NULL DEFAULT '{}',
    "crisis_flags" JSONB NOT NULL DEFAULT '[]',
    "generated_summary" TEXT NOT NULL,
    "expert_insights" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_prep_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_partners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "api_key" VARCHAR(255) NOT NULL,
    "api_secret" VARCHAR(255) NOT NULL,
    "webhook_url" VARCHAR(500),
    "webhook_secret" VARCHAR(255),
    "status" "IntegrationPartnerStatus" NOT NULL DEFAULT 'active',
    "rate_limit_per_min" INTEGER NOT NULL DEFAULT 100,
    "ip_allowlist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_access_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partner_id" UUID NOT NULL,
    "endpoint" VARCHAR(500) NOT NULL,
    "client_id" UUID,
    "response_code" SMALLINT NOT NULL,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "therapist_clients_invite_code_key" ON "therapist_clients"("invite_code");
CREATE UNIQUE INDEX "therapist_clients_therapist_id_client_id_key" ON "therapist_clients"("therapist_id", "client_id");
CREATE INDEX "therapist_clients_therapist_id_idx" ON "therapist_clients"("therapist_id");
CREATE INDEX "therapist_clients_client_id_idx" ON "therapist_clients"("client_id");
CREATE INDEX "therapist_clients_couple_id_idx" ON "therapist_clients"("couple_id");
CREATE INDEX "therapist_clients_consent_status_idx" ON "therapist_clients"("consent_status");
CREATE INDEX "therapist_clients_invite_code_idx" ON "therapist_clients"("invite_code");

-- CreateIndex
CREATE INDEX "therapist_alerts_therapist_id_read_at_idx" ON "therapist_alerts"("therapist_id", "read_at");
CREATE INDEX "therapist_alerts_therapist_id_alert_type_idx" ON "therapist_alerts"("therapist_id", "alert_type");
CREATE INDEX "therapist_alerts_client_id_idx" ON "therapist_alerts"("client_id");
CREATE INDEX "therapist_alerts_created_at_idx" ON "therapist_alerts"("created_at" DESC);

-- CreateIndex
CREATE INDEX "session_prep_reports_therapist_id_idx" ON "session_prep_reports"("therapist_id");
CREATE INDEX "session_prep_reports_client_id_idx" ON "session_prep_reports"("client_id");
CREATE INDEX "session_prep_reports_couple_id_idx" ON "session_prep_reports"("couple_id");
CREATE INDEX "session_prep_reports_report_date_idx" ON "session_prep_reports"("report_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "integration_partners_api_key_key" ON "integration_partners"("api_key");
CREATE INDEX "integration_partners_api_key_idx" ON "integration_partners"("api_key");
CREATE INDEX "integration_partners_status_idx" ON "integration_partners"("status");

-- CreateIndex
CREATE INDEX "integration_access_logs_partner_id_created_at_idx" ON "integration_access_logs"("partner_id", "created_at" DESC);
CREATE INDEX "integration_access_logs_client_id_idx" ON "integration_access_logs"("client_id");
CREATE INDEX "integration_access_logs_created_at_idx" ON "integration_access_logs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "therapist_clients" ADD CONSTRAINT "therapist_clients_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "therapists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "therapist_clients" ADD CONSTRAINT "therapist_clients_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "therapist_clients" ADD CONSTRAINT "therapist_clients_couple_id_fkey" FOREIGN KEY ("couple_id") REFERENCES "relationships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapist_alerts" ADD CONSTRAINT "therapist_alerts_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "therapists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "therapist_alerts" ADD CONSTRAINT "therapist_alerts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_prep_reports" ADD CONSTRAINT "session_prep_reports_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "therapists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_access_logs" ADD CONSTRAINT "integration_access_logs_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "integration_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
