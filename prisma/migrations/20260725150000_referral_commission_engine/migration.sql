-- Referral Commission Engine

CREATE TYPE "ReferralCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED');
CREATE TYPE "ReferralCommissionType" AS ENUM ('FLAT', 'PERCENTAGE', 'HYBRID');
CREATE TYPE "ReferralCommissionBasis" AS ENUM ('COURSE_FEE', 'ADMISSION_FEE', 'INSTALLMENT_AMOUNT', 'CUSTOM_AMOUNT');
CREATE TYPE "ReferralMilestoneTrigger" AS ENUM (
  'ADMISSION_CONFIRMED',
  'REGISTRATION_FEE_PAID',
  'FIRST_INSTALLMENT_PAID',
  'SECOND_INSTALLMENT_PAID',
  'THIRD_INSTALLMENT_PAID',
  'FULL_FEE_PAID',
  'MANUAL'
);
CREATE TYPE "ReferralMilestoneCalcType" AS ENUM ('FLAT', 'PERCENTAGE');
CREATE TYPE "ReferralCommissionTxnStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED');
CREATE TYPE "ReferralPaymentMethod" AS ENUM ('UPI', 'BANK_TRANSFER', 'CASH');

CREATE TABLE "referral_campaigns" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "status" "ReferralCampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "max_referrals" INTEGER,
  "terms_version" TEXT NOT NULL,
  "commission_type" "ReferralCommissionType" NOT NULL,
  "commission_basis" "ReferralCommissionBasis" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "referral_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "referral_campaign_courses" (
  "id" TEXT NOT NULL,
  "campaign_id" TEXT NOT NULL,
  "learning_path_id" TEXT NOT NULL,

  CONSTRAINT "referral_campaign_courses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "referral_campaign_milestones" (
  "id" TEXT NOT NULL,
  "campaign_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "trigger" "ReferralMilestoneTrigger" NOT NULL,
  "calculation_type" "ReferralMilestoneCalcType" NOT NULL,
  "value" DECIMAL(12,4) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "referral_campaign_milestones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "referral_commission_transactions" (
  "id" TEXT NOT NULL,
  "referral_id" TEXT NOT NULL,
  "campaign_id" TEXT NOT NULL,
  "milestone_id" TEXT NOT NULL,
  "learning_path_id" TEXT,
  "calculation_type" "ReferralMilestoneCalcType" NOT NULL,
  "value" DECIMAL(12,4) NOT NULL,
  "payment_basis_amount" DECIMAL(12,2) NOT NULL,
  "calculated_amount" DECIMAL(12,2) NOT NULL,
  "commission_basis" "ReferralCommissionBasis" NOT NULL,
  "trigger" "ReferralMilestoneTrigger" NOT NULL,
  "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "ReferralCommissionTxnStatus" NOT NULL DEFAULT 'PENDING',
  "approved_by_id" UUID,
  "approved_at" TIMESTAMP(3),
  "status_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "referral_commission_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "referral_commission_payments" (
  "id" TEXT NOT NULL,
  "transaction_id" TEXT NOT NULL,
  "payment_date" TIMESTAMP(3) NOT NULL,
  "amount_paid" DECIMAL(12,2) NOT NULL,
  "payment_method" "ReferralPaymentMethod" NOT NULL,
  "reference_number" TEXT,
  "remarks" TEXT,
  "paid_by_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "referral_commission_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "referral_commission_audit_events" (
  "id" TEXT NOT NULL,
  "transaction_id" TEXT,
  "campaign_id" TEXT,
  "actor_id" UUID,
  "action" TEXT NOT NULL,
  "details" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "referral_commission_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "referral_campaigns_status_starts_at_ends_at_idx" ON "referral_campaigns"("status", "starts_at", "ends_at");
CREATE INDEX "referral_campaigns_priority_idx" ON "referral_campaigns"("priority");

CREATE UNIQUE INDEX "referral_campaign_courses_campaign_id_learning_path_id_key" ON "referral_campaign_courses"("campaign_id", "learning_path_id");
CREATE UNIQUE INDEX "referral_campaign_milestones_campaign_id_sequence_key" ON "referral_campaign_milestones"("campaign_id", "sequence");
CREATE INDEX "referral_campaign_milestones_campaign_id_trigger_idx" ON "referral_campaign_milestones"("campaign_id", "trigger");

CREATE UNIQUE INDEX "referral_commission_transactions_referral_id_milestone_id_key" ON "referral_commission_transactions"("referral_id", "milestone_id");
CREATE INDEX "referral_commission_transactions_status_transaction_date_idx" ON "referral_commission_transactions"("status", "transaction_date");
CREATE INDEX "referral_commission_transactions_campaign_id_idx" ON "referral_commission_transactions"("campaign_id");
CREATE INDEX "referral_commission_transactions_referral_id_idx" ON "referral_commission_transactions"("referral_id");

CREATE UNIQUE INDEX "referral_commission_payments_transaction_id_key" ON "referral_commission_payments"("transaction_id");
CREATE INDEX "referral_commission_payments_payment_date_idx" ON "referral_commission_payments"("payment_date");

CREATE INDEX "referral_commission_audit_events_created_at_idx" ON "referral_commission_audit_events"("created_at");
CREATE INDEX "referral_commission_audit_events_transaction_id_idx" ON "referral_commission_audit_events"("transaction_id");

ALTER TABLE "referral_campaign_courses" ADD CONSTRAINT "referral_campaign_courses_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "referral_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_campaign_courses" ADD CONSTRAINT "referral_campaign_courses_learning_path_id_fkey" FOREIGN KEY ("learning_path_id") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "referral_campaign_milestones" ADD CONSTRAINT "referral_campaign_milestones_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "referral_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "referral_commission_transactions" ADD CONSTRAINT "referral_commission_transactions_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_commission_transactions" ADD CONSTRAINT "referral_commission_transactions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "referral_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "referral_commission_transactions" ADD CONSTRAINT "referral_commission_transactions_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "referral_campaign_milestones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "referral_commission_transactions" ADD CONSTRAINT "referral_commission_transactions_learning_path_id_fkey" FOREIGN KEY ("learning_path_id") REFERENCES "learning_paths"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "referral_commission_transactions" ADD CONSTRAINT "referral_commission_transactions_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "referral_commission_payments" ADD CONSTRAINT "referral_commission_payments_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "referral_commission_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_commission_payments" ADD CONSTRAINT "referral_commission_payments_paid_by_id_fkey" FOREIGN KEY ("paid_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "referral_commission_audit_events" ADD CONSTRAINT "referral_commission_audit_events_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "referral_commission_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "referral_commission_audit_events" ADD CONSTRAINT "referral_commission_audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
