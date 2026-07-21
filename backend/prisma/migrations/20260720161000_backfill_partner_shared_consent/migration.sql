-- sharedConsent now means partner-to-partner data sharing, established when a
-- couple links (invite + accept — a mutual opt-in). Backfill it for every
-- already-linked couple; previously it was only set as a side effect of BOTH
-- partners granting therapist consent, which locked therapist-less couples out
-- of assessment comparison and partner reports.
UPDATE "relationships" SET "shared_consent" = true
WHERE "user2_id" IS NOT NULL AND "shared_consent" = false;
