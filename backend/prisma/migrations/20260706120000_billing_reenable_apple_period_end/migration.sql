-- Billing re-enablement: extra entitlement fields on users.
--
-- apple_expires_at: expiry of the active auto-renewable Apple subscription,
--   taken from the validated App Store receipt (never from the client).
-- subscription_current_period_end: end of the current Stripe billing period,
--   surfaced in the subscription status response.
-- AlterTable
ALTER TABLE "users" ADD COLUMN "apple_expires_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "subscription_current_period_end" TIMESTAMP(3);
