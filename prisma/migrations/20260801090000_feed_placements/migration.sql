-- Where a feed item is allowed to render (main feed, learning paths list, ...).
-- Defaults to FEED so every existing row keeps rendering exactly where it does today.
CREATE TYPE "FeedPlacement" AS ENUM ('FEED', 'LEARNING_PATH_LIST');

ALTER TABLE "feed_items"
  ADD COLUMN "placements" "FeedPlacement"[] NOT NULL DEFAULT ARRAY['FEED']::"FeedPlacement"[];
