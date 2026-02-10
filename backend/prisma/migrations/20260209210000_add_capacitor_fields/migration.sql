-- CreateEnum
CREATE TYPE "SubscriptionSource" AS ENUM ('STRIPE', 'APPLE', 'NONE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "push_token" VARCHAR(500),
ADD COLUMN "push_platform" VARCHAR(10),
ADD COLUMN "subscription_source" "SubscriptionSource" NOT NULL DEFAULT 'NONE',
ADD COLUMN "apple_receipt_data" TEXT;
