-- CreateTable
CREATE TABLE "gratitude_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "text" TEXT NOT NULL,
    "category" VARCHAR(50),
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gratitude_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gratitude_entries_user_id_idx" ON "gratitude_entries"("user_id");

-- CreateIndex
CREATE INDEX "gratitude_entries_date_idx" ON "gratitude_entries"("date");

-- CreateIndex
CREATE INDEX "gratitude_entries_user_id_date_idx" ON "gratitude_entries"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "gratitude_entries_user_id_date_key" ON "gratitude_entries"("user_id", "date");

-- AddForeignKey
ALTER TABLE "gratitude_entries" ADD CONSTRAINT "gratitude_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
