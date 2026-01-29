-- CreateEnum
CREATE TYPE "MediatorStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('scheduled', 'completed', 'cancelled');

-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'premium';

-- CreateTable
CREATE TABLE "daily_insights" (
    "id" UUID NOT NULL,
    "week" SMALLINT NOT NULL,
    "day" SMALLINT NOT NULL,
    "base_text" TEXT NOT NULL,
    "personalization_tags" JSONB,

    CONSTRAINT "daily_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_videos" (
    "id" UUID NOT NULL,
    "week" SMALLINT NOT NULL,
    "day" SMALLINT NOT NULL,
    "youtube_id" VARCHAR(20) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "daily_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_completions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "video_id" UUID NOT NULL,
    "watched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mediators" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "bio" TEXT NOT NULL,
    "google_calendar_id" VARCHAR(255) NOT NULL,
    "availability_rules" JSONB NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "MediatorStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mediators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" UUID NOT NULL,
    "relationship_id" UUID NOT NULL,
    "mediator_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration" SMALLINT NOT NULL DEFAULT 30,
    "meet_link" VARCHAR(255),
    "calendar_event_id" VARCHAR(255),
    "status" "MeetingStatus" NOT NULL DEFAULT 'scheduled',
    "week" SMALLINT NOT NULL,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "partner_consent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_insights_week_day_key" ON "daily_insights"("week", "day");

-- CreateIndex
CREATE UNIQUE INDEX "daily_videos_week_day_key" ON "daily_videos"("week", "day");

-- CreateIndex
CREATE INDEX "video_completions_user_id_idx" ON "video_completions"("user_id");

-- CreateIndex
CREATE INDEX "video_completions_video_id_idx" ON "video_completions"("video_id");

-- CreateIndex
CREATE UNIQUE INDEX "video_completions_user_id_video_id_key" ON "video_completions"("user_id", "video_id");

-- CreateIndex
CREATE UNIQUE INDEX "mediators_google_calendar_id_key" ON "mediators"("google_calendar_id");

-- CreateIndex
CREATE INDEX "mediators_status_idx" ON "mediators"("status");

-- CreateIndex
CREATE INDEX "meetings_relationship_id_idx" ON "meetings"("relationship_id");

-- CreateIndex
CREATE INDEX "meetings_mediator_id_idx" ON "meetings"("mediator_id");

-- CreateIndex
CREATE INDEX "meetings_status_idx" ON "meetings"("status");

-- CreateIndex
CREATE INDEX "meetings_scheduled_at_idx" ON "meetings"("scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "meetings_relationship_id_week_key" ON "meetings"("relationship_id", "week");

-- AddForeignKey
ALTER TABLE "video_completions" ADD CONSTRAINT "video_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_completions" ADD CONSTRAINT "video_completions_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "daily_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_mediator_id_fkey" FOREIGN KEY ("mediator_id") REFERENCES "mediators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
