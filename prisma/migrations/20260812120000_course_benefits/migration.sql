-- Coupons/scholarships/perks as real, expirable, reusable entities that get
-- mapped onto specific course variants, replacing the earlier free-text
-- launchFee/offerLabel fields on the variant JSON.
CREATE TYPE "BenefitKind" AS ENUM ('DISCOUNT_FLAT', 'DISCOUNT_PERCENT', 'PROMO_CODE', 'PERK');

CREATE TABLE "benefits" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "BenefitKind" NOT NULL,
    "code" TEXT,
    "discount_amount" INTEGER,
    "discount_percent" INTEGER,
    "description" TEXT,
    "starts_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benefits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "course_variant_benefits" (
    "id" TEXT NOT NULL,
    "feed_item_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "benefit_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_variant_benefits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "course_variant_benefits_variant_id_benefit_id_key" ON "course_variant_benefits"("variant_id", "benefit_id");
CREATE INDEX "course_variant_benefits_feed_item_id_idx" ON "course_variant_benefits"("feed_item_id");

ALTER TABLE "course_variant_benefits" ADD CONSTRAINT "course_variant_benefits_feed_item_id_fkey"
    FOREIGN KEY ("feed_item_id") REFERENCES "feed_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "course_variant_benefits" ADD CONSTRAINT "course_variant_benefits_benefit_id_fkey"
    FOREIGN KEY ("benefit_id") REFERENCES "benefits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
