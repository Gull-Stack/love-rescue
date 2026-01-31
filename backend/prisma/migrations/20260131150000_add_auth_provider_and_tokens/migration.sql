-- AlterTable: Add auth_provider column to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_provider" VARCHAR(20) NOT NULL DEFAULT 'email';

-- Make password_hash nullable (for Google-only users)
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateTable: tokens for email verify, password reset, invites
CREATE TABLE IF NOT EXISTS "tokens" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tokens_token_key" ON "tokens"("token");
