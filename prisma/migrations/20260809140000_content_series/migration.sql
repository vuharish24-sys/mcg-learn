-- A master topic's multi-asset content plan. Generated FeedItems link back
-- here via content_series_id, and carry their specific angle within the
-- series (e.g. "Day 3 - ICD-10-CM vs CPT") in series_angle.
CREATE TABLE "content_series" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_series_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "feed_items"
  ADD COLUMN "content_series_id" TEXT,
  ADD COLUMN "series_angle" TEXT;

ALTER TABLE "feed_items"
  ADD CONSTRAINT "feed_items_content_series_id_fkey"
  FOREIGN KEY ("content_series_id") REFERENCES "content_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "feed_items_content_series_id_idx" ON "feed_items"("content_series_id");
