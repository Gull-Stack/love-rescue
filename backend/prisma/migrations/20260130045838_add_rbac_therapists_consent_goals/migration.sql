-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'therapist', 'admin');

-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('active', 'paused', 'ended');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('active', 'revoked');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('active', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('high', 'medium', 'low');

-- AlterTable
ALTER TABLE "daily_logs" ADD COLUMN     "is_private" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "therapist_visible" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "relationships" ADD COLUMN     "invite_expires_at" TIMESTAMP(3),
ADD COLUMN     "status" "RelationshipStatus" NOT NULL DEFAULT 'active',
ADD COLUMN     "user1_therapist_consent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "user2_therapist_consent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "therapist_tasks" ADD COLUMN     "assigned_to_user_id" UUID,
ADD COLUMN     "priority" "TaskPriority" NOT NULL DEFAULT 'medium';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "therapists" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "license_number" VARCHAR(100),
    "license_state" VARCHAR(10),
    "api_key_hash" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapist_assignments" (
    "id" UUID NOT NULL,
    "therapist_id" UUID NOT NULL,
    "relationship_id" UUID NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'active',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "therapist_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_logs" (
    "id" UUID NOT NULL,
    "accessor_id" UUID NOT NULL,
    "accessor_role" VARCHAR(20) NOT NULL,
    "resource_type" VARCHAR(50) NOT NULL,
    "resource_id" UUID,
    "resource_owner_id" UUID,
    "action" VARCHAR(20) NOT NULL,
    "access_granted" BOOLEAN NOT NULL,
    "reason" VARCHAR(255),
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "relationship_id" UUID NOT NULL,
    "consent_type" VARCHAR(30) NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "ip_address" VARCHAR(45),
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_goals" (
    "id" UUID NOT NULL,
    "relationship_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "target_date" DATE,
    "status" "GoalStatus" NOT NULL DEFAULT 'active',
    "created_by" UUID NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shared_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "therapists_email_key" ON "therapists"("email");

-- CreateIndex
CREATE UNIQUE INDEX "therapists_api_key_hash_key" ON "therapists"("api_key_hash");

-- CreateIndex
CREATE INDEX "therapists_email_idx" ON "therapists"("email");

-- CreateIndex
CREATE INDEX "therapists_api_key_hash_idx" ON "therapists"("api_key_hash");

-- CreateIndex
CREATE INDEX "therapist_assignments_therapist_id_idx" ON "therapist_assignments"("therapist_id");

-- CreateIndex
CREATE INDEX "therapist_assignments_relationship_id_idx" ON "therapist_assignments"("relationship_id");

-- CreateIndex
CREATE INDEX "therapist_assignments_status_idx" ON "therapist_assignments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "therapist_assignments_therapist_id_relationship_id_key" ON "therapist_assignments"("therapist_id", "relationship_id");

-- CreateIndex
CREATE INDEX "access_logs_accessor_id_created_at_idx" ON "access_logs"("accessor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "access_logs_resource_owner_id_created_at_idx" ON "access_logs"("resource_owner_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "consent_logs_user_id_consent_type_granted_at_idx" ON "consent_logs"("user_id", "consent_type", "granted_at" DESC);

-- CreateIndex
CREATE INDEX "shared_goals_relationship_id_idx" ON "shared_goals"("relationship_id");

-- CreateIndex
CREATE INDEX "shared_goals_status_idx" ON "shared_goals"("status");

-- CreateIndex
CREATE INDEX "relationships_status_idx" ON "relationships"("status");

-- CreateIndex
CREATE INDEX "therapist_tasks_assigned_to_user_id_idx" ON "therapist_tasks"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- AddForeignKey
ALTER TABLE "therapist_assignments" ADD CONSTRAINT "therapist_assignments_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "therapists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapist_assignments" ADD CONSTRAINT "therapist_assignments_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapist_tasks" ADD CONSTRAINT "therapist_tasks_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "therapists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapist_tasks" ADD CONSTRAINT "therapist_tasks_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_logs" ADD CONSTRAINT "consent_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_logs" ADD CONSTRAINT "consent_logs_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_goals" ADD CONSTRAINT "shared_goals_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_goals" ADD CONSTRAINT "shared_goals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
