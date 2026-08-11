-- A job posting can optionally be scoped exclusively to one partner's board
-- instead of MCG's global feed.
ALTER TABLE "feed_items" ADD COLUMN "posted_by_partner_id" TEXT;

ALTER TABLE "feed_items" ADD CONSTRAINT "feed_items_posted_by_partner_id_fkey"
    FOREIGN KEY ("posted_by_partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "feed_items_posted_by_partner_id_idx" ON "feed_items"("posted_by_partner_id");

-- A partner's admin-approved request to also see another partner's
-- exclusive job board.
CREATE TYPE "PartnerSubscriptionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "partner_subscriptions" (
    "id" TEXT NOT NULL,
    "requesting_partner_id" TEXT NOT NULL,
    "target_partner_id" TEXT NOT NULL,
    "status" "PartnerSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "contact_name" TEXT,
    "contact_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_subscriptions_requesting_partner_id_target_partner_id_key"
    ON "partner_subscriptions"("requesting_partner_id", "target_partner_id");

ALTER TABLE "partner_subscriptions" ADD CONSTRAINT "partner_subscriptions_requesting_partner_id_fkey"
    FOREIGN KEY ("requesting_partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "partner_subscriptions" ADD CONSTRAINT "partner_subscriptions_target_partner_id_fkey"
    FOREIGN KEY ("target_partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
