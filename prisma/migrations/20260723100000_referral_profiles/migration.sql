-- CreateEnum
CREATE TYPE "ReferralProfileStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "referral_profiles" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "referral_code" TEXT NOT NULL,
    "status" "ReferralProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "terms_accepted" BOOLEAN NOT NULL,
    "terms_accepted_at" TIMESTAMP(3) NOT NULL,
    "privacy_accepted" BOOLEAN NOT NULL,
    "privacy_accepted_at" TIMESTAMP(3) NOT NULL,
    "terms_version" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL,
    "campaign_eligible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referral_profiles_user_id_key" ON "referral_profiles"("user_id");
CREATE UNIQUE INDEX "referral_profiles_referral_code_key" ON "referral_profiles"("referral_code");
CREATE INDEX "referral_profiles_status_idx" ON "referral_profiles"("status");

-- AddForeignKey
ALTER TABLE "referral_profiles" ADD CONSTRAINT "referral_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
