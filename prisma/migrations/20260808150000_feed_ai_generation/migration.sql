-- Tracks the topic/prompt an admin gave the AI content generator, so generated
-- items can be labeled in the admin UI. Null for manually-authored items.
ALTER TABLE "feed_items"
  ADD COLUMN "generation_topic" TEXT;
