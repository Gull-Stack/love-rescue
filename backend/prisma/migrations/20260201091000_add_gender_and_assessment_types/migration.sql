-- AlterEnum
ALTER TYPE "AssessmentType" ADD VALUE 'hormonal_health';
ALTER TYPE "AssessmentType" ADD VALUE 'physical_vitality';

-- AlterTable
ALTER TABLE "users" ADD COLUMN "gender" VARCHAR(20);
