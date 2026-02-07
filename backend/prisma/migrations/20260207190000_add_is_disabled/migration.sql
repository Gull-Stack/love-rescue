-- Add is_disabled column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_disabled" BOOLEAN NOT NULL DEFAULT false;
