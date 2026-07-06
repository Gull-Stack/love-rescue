-- Therapist practice backend: session notes + appointments.
--
-- session_notes: the therapist's clinical work product. `content` (and the
--   optional structured `soap` payload) are encrypted at rest by the route
--   layer when CONTENT_ENCRYPTION is enabled. Notes are soft-deleted via
--   `deleted_at` — clinical records are never hard-deleted. A note targets an
--   individual client (client_id) and/or a couple (relationship_id).
--
-- appointments: therapist calendar. `client_note` is the only free-text field
--   a client ever sees. `reminder_sent_at` is stamped by the hourly reminder
--   scan so each appointment gets at most one 24h-ahead reminder email.

-- CreateTable
CREATE TABLE "session_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "therapist_id" UUID NOT NULL,
    "client_id" UUID,
    "relationship_id" UUID,
    "appointment_id" UUID,
    "session_date" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "note_format" VARCHAR(20),
    "soap" JSONB,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "therapist_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "relationship_id" UUID,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" SMALLINT NOT NULL DEFAULT 50,
    "status" VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    "location_type" VARCHAR(20),
    "client_note" TEXT,
    "cancelled_by" VARCHAR(20),
    "reminder_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_notes_therapist_id_client_id_session_date_idx" ON "session_notes"("therapist_id", "client_id", "session_date");

-- CreateIndex
CREATE INDEX "session_notes_client_id_idx" ON "session_notes"("client_id");

-- CreateIndex
CREATE INDEX "session_notes_relationship_id_idx" ON "session_notes"("relationship_id");

-- CreateIndex
CREATE INDEX "session_notes_appointment_id_idx" ON "session_notes"("appointment_id");

-- CreateIndex
CREATE INDEX "session_notes_therapist_id_deleted_at_idx" ON "session_notes"("therapist_id", "deleted_at");

-- CreateIndex
CREATE INDEX "appointments_therapist_id_scheduled_at_idx" ON "appointments"("therapist_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "appointments_client_id_scheduled_at_idx" ON "appointments"("client_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "appointments_reminder_sent_at_scheduled_at_idx" ON "appointments"("reminder_sent_at", "scheduled_at");

-- AddForeignKey
ALTER TABLE "session_notes" ADD CONSTRAINT "session_notes_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "therapists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_notes" ADD CONSTRAINT "session_notes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_notes" ADD CONSTRAINT "session_notes_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "relationships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_notes" ADD CONSTRAINT "session_notes_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "therapists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "relationships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
