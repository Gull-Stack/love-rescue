-- Add last_active_at to users. Auth (/auth/me) has been attempting to write
-- this column since the admin dashboard shipped; admin stats/users/command-center
-- query it for DAU/WAU/MAU and churn detection.
ALTER TABLE "users" ADD COLUMN "last_active_at" TIMESTAMP(3);

CREATE INDEX "users_last_active_at_idx" ON "users"("last_active_at");
