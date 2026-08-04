-- Referral Campaign & Commission Management System (additive)

-- Enum extensions
ALTER TYPE "ReferralCampaignStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';
ALTER TYPE "ReferralMilestoneTrigger" ADD VALUE IF NOT EXISTS 'MANUAL_APPROVAL';
ALTER TYPE "ReferralPaymentMethod" ADD VALUE IF NOT EXISTS 'CHEQUE';
ALTER TYPE "ReferralPaymentMethod" ADD VALUE IF NOT EXISTS 'OTHER';

DO $$ BEGIN
  CREATE TYPE "ReferralParticipantStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LEFT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ReferralMilestoneStatus" AS ENUM ('PENDING', 'ACHIEVED', 'APPROVED', 'PAID', 'EXPIRED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ReferralCampaignAssetType" AS ENUM ('BANNER', 'THUMBNAIL', 'MOBILE_BANNER', 'PROMOTIONAL_POSTER', 'STORY_IMAGE', 'EMAIL_BANNER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Campaign columns
ALTER TABLE "referral_campaigns" ADD COLUMN IF NOT EXISTS "short_title" TEXT;
ALTER TABLE "referral_campaigns" ADD COLUMN IF NOT EXISTS "campaign_code" TEXT;
ALTER TABLE "referral_campaigns" ADD COLUMN IF NOT EXISTS "registration_starts_at" TIMESTAMP(3);
ALTER TABLE "referral_campaigns" ADD COLUMN IF NOT EXISTS "registration_ends_at" TIMESTAMP(3);
ALTER TABLE "referral_campaigns" ADD COLUMN IF NOT EXISTS "referral_starts_at" TIMESTAMP(3);
ALTER TABLE "referral_campaigns" ADD COLUMN IF NOT EXISTS "referral_ends_at" TIMESTAMP(3);
ALTER TABLE "referral_campaigns" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "referral_campaigns" ADD COLUMN IF NOT EXISTS "publish_as_feed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "referral_campaigns" ADD COLUMN IF NOT EXISTS "cloned_from_id" TEXT;

UPDATE "referral_campaigns"
SET "campaign_code" = 'CMP-' || UPPER(SUBSTRING(id FROM 1 FOR 8))
WHERE "campaign_code" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "referral_campaigns_campaign_code_key" ON "referral_campaigns"("campaign_code");
CREATE INDEX IF NOT EXISTS "referral_campaigns_is_active_idx" ON "referral_campaigns"("is_active");

ALTER TABLE "referral_campaigns"
  DROP CONSTRAINT IF EXISTS "referral_campaigns_cloned_from_id_fkey";
ALTER TABLE "referral_campaigns"
  ADD CONSTRAINT "referral_campaigns_cloned_from_id_fkey"
  FOREIGN KEY ("cloned_from_id") REFERENCES "referral_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Milestone rule columns
ALTER TABLE "referral_campaign_milestones" ADD COLUMN IF NOT EXISTS "commission_basis" "ReferralCommissionBasis";
ALTER TABLE "referral_campaign_milestones" ADD COLUMN IF NOT EXISTS "default_due_days" INTEGER;
ALTER TABLE "referral_campaign_milestones" ADD COLUMN IF NOT EXISTS "default_expiry_days" INTEGER;
ALTER TABLE "referral_campaign_milestones" ADD COLUMN IF NOT EXISTS "allow_override" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "referral_campaign_milestones" ADD COLUMN IF NOT EXISTS "allow_extension" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "referral_campaign_milestones" ADD COLUMN IF NOT EXISTS "max_extension_days" INTEGER;
ALTER TABLE "referral_campaign_milestones" ADD COLUMN IF NOT EXISTS "auto_expire" BOOLEAN NOT NULL DEFAULT true;

-- Program privacy version
ALTER TABLE "referral_profiles" ADD COLUMN IF NOT EXISTS "privacy_version" TEXT NOT NULL DEFAULT 'PRIVACY-2026-01';

-- Commission txn link + paidAt
ALTER TABLE "referral_commission_transactions" ADD COLUMN IF NOT EXISTS "referral_milestone_id" TEXT;
ALTER TABLE "referral_commission_transactions" ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "referral_commission_transactions_referral_milestone_id_key"
  ON "referral_commission_transactions"("referral_milestone_id");

-- Assets
CREATE TABLE IF NOT EXISTS "referral_campaign_assets" (
  "id" TEXT NOT NULL,
  "campaign_id" TEXT NOT NULL,
  "asset_type" "ReferralCampaignAssetType" NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_url" TEXT NOT NULL,
  "file_type" TEXT,
  "file_size" INTEGER,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "referral_campaign_assets_pkey" PRIMARY KEY ("id")
);

-- Terms
CREATE TABLE IF NOT EXISTS "referral_campaign_terms" (
  "id" TEXT NOT NULL,
  "campaign_id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "effective_date" TIMESTAMP(3) NOT NULL,
  "is_current" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "referral_campaign_terms_pkey" PRIMARY KEY ("id")
);

-- FAQs
CREATE TABLE IF NOT EXISTS "referral_campaign_faqs" (
  "id" TEXT NOT NULL,
  "campaign_id" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "referral_campaign_faqs_pkey" PRIMARY KEY ("id")
);

-- Participants (join campaign)
CREATE TABLE IF NOT EXISTS "referral_participants" (
  "id" TEXT NOT NULL,
  "campaign_id" TEXT NOT NULL,
  "user_id" UUID NOT NULL,
  "status" "ReferralParticipantStatus" NOT NULL DEFAULT 'ACTIVE',
  "terms_accepted" BOOLEAN NOT NULL,
  "terms_version" TEXT NOT NULL,
  "accepted_at" TIMESTAMP(3) NOT NULL,
  "accepted_by_id" UUID NOT NULL,
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "referral_participants_pkey" PRIMARY KEY ("id")
);

-- Referral enrolled into campaign
CREATE TABLE IF NOT EXISTS "referral_campaign_enrollments" (
  "id" TEXT NOT NULL,
  "campaign_id" TEXT NOT NULL,
  "referral_id" TEXT NOT NULL,
  "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referral_campaign_enrollments_pkey" PRIMARY KEY ("id")
);

-- Per-referral milestones
CREATE TABLE IF NOT EXISTS "referral_milestones" (
  "id" TEXT NOT NULL,
  "referral_id" TEXT NOT NULL,
  "campaign_id" TEXT NOT NULL,
  "campaign_milestone_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "trigger" "ReferralMilestoneTrigger" NOT NULL,
  "calculation_type" "ReferralMilestoneCalcType" NOT NULL,
  "value" DECIMAL(12,4) NOT NULL,
  "commission_basis" "ReferralCommissionBasis" NOT NULL,
  "due_date" TIMESTAMP(3),
  "expiry_date" TIMESTAMP(3),
  "status" "ReferralMilestoneStatus" NOT NULL DEFAULT 'PENDING',
  "achieved_at" TIMESTAMP(3),
  "approved_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "extended_by_id" UUID,
  "extension_date" TIMESTAMP(3),
  "extension_reason" TEXT,
  "remarks" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "referral_milestones_pkey" PRIMARY KEY ("id")
);

-- Payment proofs
CREATE TABLE IF NOT EXISTS "referral_payment_attachments" (
  "id" TEXT NOT NULL,
  "payment_id" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_url" TEXT NOT NULL,
  "file_type" TEXT NOT NULL,
  "file_size" INTEGER,
  "uploaded_by_id" UUID NOT NULL,
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referral_payment_attachments_pkey" PRIMARY KEY ("id")
);

-- Feed links
CREATE TABLE IF NOT EXISTS "campaign_feed_links" (
  "id" TEXT NOT NULL,
  "campaign_id" TEXT NOT NULL,
  "feed_item_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campaign_feed_links_pkey" PRIMARY KEY ("id")
);

-- Campaign audit
CREATE TABLE IF NOT EXISTS "referral_campaign_audit_logs" (
  "id" TEXT NOT NULL,
  "campaign_id" TEXT,
  "actor_id" UUID,
  "action" TEXT NOT NULL,
  "old_value" JSONB,
  "new_value" JSONB,
  "ip_address" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referral_campaign_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "referral_campaign_assets_campaign_id_asset_type_idx" ON "referral_campaign_assets"("campaign_id", "asset_type");
CREATE UNIQUE INDEX IF NOT EXISTS "referral_campaign_terms_campaign_id_version_key" ON "referral_campaign_terms"("campaign_id", "version");
CREATE INDEX IF NOT EXISTS "referral_campaign_terms_campaign_id_is_current_idx" ON "referral_campaign_terms"("campaign_id", "is_current");
CREATE INDEX IF NOT EXISTS "referral_campaign_faqs_campaign_id_sort_order_idx" ON "referral_campaign_faqs"("campaign_id", "sort_order");
CREATE UNIQUE INDEX IF NOT EXISTS "referral_participants_campaign_id_user_id_key" ON "referral_participants"("campaign_id", "user_id");
CREATE INDEX IF NOT EXISTS "referral_participants_user_id_status_idx" ON "referral_participants"("user_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "referral_campaign_enrollments_campaign_id_referral_id_key" ON "referral_campaign_enrollments"("campaign_id", "referral_id");
CREATE INDEX IF NOT EXISTS "referral_campaign_enrollments_referral_id_idx" ON "referral_campaign_enrollments"("referral_id");
CREATE UNIQUE INDEX IF NOT EXISTS "referral_milestones_referral_id_campaign_milestone_id_key" ON "referral_milestones"("referral_id", "campaign_milestone_id");
CREATE INDEX IF NOT EXISTS "referral_milestones_campaign_id_status_idx" ON "referral_milestones"("campaign_id", "status");
CREATE INDEX IF NOT EXISTS "referral_milestones_expiry_date_status_idx" ON "referral_milestones"("expiry_date", "status");
CREATE INDEX IF NOT EXISTS "referral_payment_attachments_payment_id_idx" ON "referral_payment_attachments"("payment_id");
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_feed_links_campaign_id_feed_item_id_key" ON "campaign_feed_links"("campaign_id", "feed_item_id");
CREATE INDEX IF NOT EXISTS "referral_campaign_audit_logs_created_at_idx" ON "referral_campaign_audit_logs"("created_at");
CREATE INDEX IF NOT EXISTS "referral_campaign_audit_logs_campaign_id_idx" ON "referral_campaign_audit_logs"("campaign_id");

-- FKs
ALTER TABLE "referral_campaign_assets" DROP CONSTRAINT IF EXISTS "referral_campaign_assets_campaign_id_fkey";
ALTER TABLE "referral_campaign_assets" ADD CONSTRAINT "referral_campaign_assets_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "referral_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "referral_campaign_terms" DROP CONSTRAINT IF EXISTS "referral_campaign_terms_campaign_id_fkey";
ALTER TABLE "referral_campaign_terms" ADD CONSTRAINT "referral_campaign_terms_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "referral_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "referral_campaign_faqs" DROP CONSTRAINT IF EXISTS "referral_campaign_faqs_campaign_id_fkey";
ALTER TABLE "referral_campaign_faqs" ADD CONSTRAINT "referral_campaign_faqs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "referral_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "referral_participants" DROP CONSTRAINT IF EXISTS "referral_participants_campaign_id_fkey";
ALTER TABLE "referral_participants" ADD CONSTRAINT "referral_participants_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "referral_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_participants" DROP CONSTRAINT IF EXISTS "referral_participants_user_id_fkey";
ALTER TABLE "referral_participants" ADD CONSTRAINT "referral_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "referral_participants" DROP CONSTRAINT IF EXISTS "referral_participants_accepted_by_id_fkey";
ALTER TABLE "referral_participants" ADD CONSTRAINT "referral_participants_accepted_by_id_fkey" FOREIGN KEY ("accepted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "referral_campaign_enrollments" DROP CONSTRAINT IF EXISTS "referral_campaign_enrollments_campaign_id_fkey";
ALTER TABLE "referral_campaign_enrollments" ADD CONSTRAINT "referral_campaign_enrollments_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "referral_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_campaign_enrollments" DROP CONSTRAINT IF EXISTS "referral_campaign_enrollments_referral_id_fkey";
ALTER TABLE "referral_campaign_enrollments" ADD CONSTRAINT "referral_campaign_enrollments_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "referral_milestones" DROP CONSTRAINT IF EXISTS "referral_milestones_referral_id_fkey";
ALTER TABLE "referral_milestones" ADD CONSTRAINT "referral_milestones_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_milestones" DROP CONSTRAINT IF EXISTS "referral_milestones_campaign_id_fkey";
ALTER TABLE "referral_milestones" ADD CONSTRAINT "referral_milestones_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "referral_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "referral_milestones" DROP CONSTRAINT IF EXISTS "referral_milestones_campaign_milestone_id_fkey";
ALTER TABLE "referral_milestones" ADD CONSTRAINT "referral_milestones_campaign_milestone_id_fkey" FOREIGN KEY ("campaign_milestone_id") REFERENCES "referral_campaign_milestones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "referral_milestones" DROP CONSTRAINT IF EXISTS "referral_milestones_extended_by_id_fkey";
ALTER TABLE "referral_milestones" ADD CONSTRAINT "referral_milestones_extended_by_id_fkey" FOREIGN KEY ("extended_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "referral_commission_transactions" DROP CONSTRAINT IF EXISTS "referral_commission_transactions_referral_milestone_id_fkey";
ALTER TABLE "referral_commission_transactions" ADD CONSTRAINT "referral_commission_transactions_referral_milestone_id_fkey" FOREIGN KEY ("referral_milestone_id") REFERENCES "referral_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "referral_payment_attachments" DROP CONSTRAINT IF EXISTS "referral_payment_attachments_payment_id_fkey";
ALTER TABLE "referral_payment_attachments" ADD CONSTRAINT "referral_payment_attachments_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "referral_commission_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_payment_attachments" DROP CONSTRAINT IF EXISTS "referral_payment_attachments_uploaded_by_id_fkey";
ALTER TABLE "referral_payment_attachments" ADD CONSTRAINT "referral_payment_attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "campaign_feed_links" DROP CONSTRAINT IF EXISTS "campaign_feed_links_campaign_id_fkey";
ALTER TABLE "campaign_feed_links" ADD CONSTRAINT "campaign_feed_links_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "referral_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_feed_links" DROP CONSTRAINT IF EXISTS "campaign_feed_links_feed_item_id_fkey";
ALTER TABLE "campaign_feed_links" ADD CONSTRAINT "campaign_feed_links_feed_item_id_fkey" FOREIGN KEY ("feed_item_id") REFERENCES "feed_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "referral_campaign_audit_logs" DROP CONSTRAINT IF EXISTS "referral_campaign_audit_logs_campaign_id_fkey";
ALTER TABLE "referral_campaign_audit_logs" ADD CONSTRAINT "referral_campaign_audit_logs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "referral_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "referral_campaign_audit_logs" DROP CONSTRAINT IF EXISTS "referral_campaign_audit_logs_actor_id_fkey";
ALTER TABLE "referral_campaign_audit_logs" ADD CONSTRAINT "referral_campaign_audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Make campaign_code NOT NULL after backfill
ALTER TABLE "referral_campaigns" ALTER COLUMN "campaign_code" SET NOT NULL;
