-- CreateEnum
CREATE TYPE "RealTalkEffectiveness" AS ENUM ('effective', 'somewhat', 'ineffective');

-- CreateTable
CREATE TABLE "real_talks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "issue" TEXT NOT NULL,
    "feeling" TEXT NOT NULL,
    "need" TEXT NOT NULL,
    "generated_startup" TEXT NOT NULL,
    "effectiveness" "RealTalkEffectiveness",
    "used_at" TIMESTAMP(3),
    "notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "real_talks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "real_talks_user_id_idx" ON "real_talks"("user_id");

-- CreateIndex
CREATE INDEX "real_talks_created_at_idx" ON "real_talks"("created_at" DESC);

-- CreateIndex
CREATE INDEX "real_talks_user_id_deleted_at_idx" ON "real_talks"("user_id", "deleted_at");

-- AddForeignKey
ALTER TABLE "real_talks" ADD CONSTRAINT "real_talks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
