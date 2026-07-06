-- Grandfather existing users into a fresh 14-day trial.
--
-- Billing was re-enabled on 2026-07-06. Users created before this deploy have
-- subscription_status = 'trial' with trial_ends_at NULL (the field was never
-- written during the free era), which the entitlement resolver correctly
-- treats as NOT entitled — without this backfill every existing user would be
-- paywalled instantly on deploy with zero runway. Instead, give them the same
-- 14-day trial window a brand-new signup gets, starting now, so the in-app
-- trial messaging and upgrade funnel apply to them like everyone else.
--
-- Idempotent: only touches rows where trial_ends_at is still NULL, and only
-- trial-status rows (paid/premium/expired users are untouched).
UPDATE "users"
SET "trial_ends_at" = NOW() + INTERVAL '14 days'
WHERE "trial_ends_at" IS NULL
  AND "subscription_status" = 'trial';
