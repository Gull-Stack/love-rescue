-- Add is_disabled column to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "is_disabled" BOOLEAN NOT NULL DEFAULT false;
