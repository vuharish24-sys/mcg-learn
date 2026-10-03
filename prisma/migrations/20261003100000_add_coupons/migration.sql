-- CreateEnum
CREATE TYPE "CouponTargetType" AS ENUM ('LEARNING_PATH', 'LEARNING_PATH_MODULE', 'LEARNING_PATH_ITEM', 'BUNDLE', 'TUTOR_LMS_COURSE', 'PRACTICE_LAB_EXAM', 'PROGRAM');

-- CreateEnum
CREATE TYPE "CouponDiscountType" AS ENUM ('FLAT', 'PERCENT');

-- AlterTable
ALTER TABLE "benefits" ADD COLUMN     "coupon_id" TEXT;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "coupon_code" TEXT,
ADD COLUMN     "coupon_id" TEXT;

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "coupon_id" TEXT,
ADD COLUMN     "discount_paise" INTEGER,
ADD COLUMN     "original_amount_paise" INTEGER;

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discount_type" "CouponDiscountType" NOT NULL,
    "discount_value" INTEGER NOT NULL,
    "max_discount_paise" INTEGER,
    "min_amount_paise" INTEGER,
    "starts_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "max_redemptions" INTEGER,
    "max_per_user" INTEGER DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_targets" (
    "id" TEXT NOT NULL,
    "coupon_id" TEXT NOT NULL,
    "target_type" "CouponTargetType" NOT NULL,
    "target_id" TEXT NOT NULL,

    CONSTRAINT "coupon_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupon_targets_target_type_target_id_idx" ON "coupon_targets"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_targets_coupon_id_target_type_target_id_key" ON "coupon_targets"("coupon_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "purchases_coupon_id_idx" ON "purchases"("coupon_id");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefits" ADD CONSTRAINT "benefits_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_targets" ADD CONSTRAINT "coupon_targets_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

