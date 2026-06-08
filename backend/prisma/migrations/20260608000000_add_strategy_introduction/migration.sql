-- Add introduction column to strategies (personalized expert intro per week).
-- Fixes 500 on /api/strategies/generate (code wrote `introduction` with no column).
ALTER TABLE "strategies" ADD COLUMN "introduction" TEXT;
