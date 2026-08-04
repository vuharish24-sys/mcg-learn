-- Align user foreign keys to UUID only when older TEXT columns are present.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads'
      AND column_name = 'assigned_officer_id' AND udt_name = 'text'
  ) THEN
    ALTER TABLE "leads"
      ALTER COLUMN "assigned_officer_id" TYPE UUID USING NULLIF("assigned_officer_id", '')::uuid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lead_notes'
      AND column_name = 'author_id' AND udt_name = 'text'
  ) THEN
    ALTER TABLE "lead_notes"
      ALTER COLUMN "author_id" TYPE UUID USING "author_id"::uuid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trainers'
      AND column_name = 'user_id' AND udt_name = 'text'
  ) THEN
    ALTER TABLE "trainers"
      ALTER COLUMN "user_id" TYPE UUID USING NULLIF("user_id", '')::uuid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'referrals'
      AND column_name = 'referrer_id' AND udt_name = 'text'
  ) THEN
    ALTER TABLE "referrals"
      ALTER COLUMN "referrer_id" TYPE UUID USING "referrer_id"::uuid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'referrals'
      AND column_name = 'referred_user_id' AND udt_name = 'text'
  ) THEN
    ALTER TABLE "referrals"
      ALTER COLUMN "referred_user_id" TYPE UUID USING NULLIF("referred_user_id", '')::uuid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'certificates'
      AND column_name = 'learner_id' AND udt_name = 'text'
  ) THEN
    ALTER TABLE "certificates"
      ALTER COLUMN "learner_id" TYPE UUID USING "learner_id"::uuid;
  END IF;
END $$;
