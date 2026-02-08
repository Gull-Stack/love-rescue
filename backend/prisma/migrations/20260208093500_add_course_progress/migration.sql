-- CreateTable
CREATE TABLE "course_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "current_week" SMALLINT NOT NULL DEFAULT 1,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "week_started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_weeks" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "paused_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_strategies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_progress_id" UUID NOT NULL,
    "week_number" SMALLINT NOT NULL,
    "expert_name" VARCHAR(100) NOT NULL,
    "theme" VARCHAR(255) NOT NULL,
    "focus_areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "custom_insights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "daily_practice" TEXT NOT NULL,
    "skills_to_learn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "completed_days" SMALLINT NOT NULL DEFAULT 0,
    "practice_log" JSONB,
    "reflection" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_strategies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_progress_user_id_key" ON "course_progress"("user_id");

-- CreateIndex
CREATE INDEX "course_progress_user_id_idx" ON "course_progress"("user_id");

-- CreateIndex
CREATE INDEX "course_progress_current_week_idx" ON "course_progress"("current_week");

-- CreateIndex
CREATE INDEX "course_progress_is_active_idx" ON "course_progress"("is_active");

-- CreateIndex
CREATE INDEX "weekly_strategies_course_progress_id_idx" ON "weekly_strategies"("course_progress_id");

-- CreateIndex
CREATE INDEX "weekly_strategies_week_number_idx" ON "weekly_strategies"("week_number");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_strategies_course_progress_id_week_number_key" ON "weekly_strategies"("course_progress_id", "week_number");

-- AddForeignKey
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_strategies" ADD CONSTRAINT "weekly_strategies_course_progress_id_fkey" FOREIGN KEY ("course_progress_id") REFERENCES "course_progress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
