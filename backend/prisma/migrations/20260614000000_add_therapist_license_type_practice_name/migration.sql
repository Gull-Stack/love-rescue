-- AlterTable: add license_type and practice_name columns that exist in schema.prisma but were never migrated
ALTER TABLE "therapists" ADD COLUMN IF NOT EXISTS "license_type" VARCHAR(50);
ALTER TABLE "therapists" ADD COLUMN IF NOT EXISTS "practice_name" VARCHAR(255);
