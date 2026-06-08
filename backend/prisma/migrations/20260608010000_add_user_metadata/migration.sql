-- Add metadata JSONB column to users (stores skill-tree progress, identity hints, etc.).
-- Fixes 500 on GET /api/skill-tree and POST /api/skill-tree/practice (code read/wrote
-- user.metadata with no such column).
ALTER TABLE "users" ADD COLUMN "metadata" JSONB;
