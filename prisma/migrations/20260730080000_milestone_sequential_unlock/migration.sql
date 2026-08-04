-- Sequential milestone unlock: later milestones stay locked (no due/expiry date)
-- until the prior milestone in the sequence is approved.
ALTER TABLE "referral_milestones"
  ADD COLUMN IF NOT EXISTS "unlocked_at" TIMESTAMP(3);

-- Existing rows were all unlocked at enrollment time under the old behavior;
-- treat any milestone that already has a due date as already unlocked so we
-- don't retroactively lock in-flight referrals.
UPDATE "referral_milestones"
SET "unlocked_at" = COALESCE("achieved_at", "created_at")
WHERE "due_date" IS NOT NULL AND "unlocked_at" IS NULL;
