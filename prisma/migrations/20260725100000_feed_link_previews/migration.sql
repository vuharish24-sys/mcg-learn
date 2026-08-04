-- AlterTable
ALTER TABLE "feed_items" ADD COLUMN "preview_title" TEXT;
ALTER TABLE "feed_items" ADD COLUMN "preview_description" TEXT;
ALTER TABLE "feed_items" ADD COLUMN "preview_image_url" TEXT;
ALTER TABLE "feed_items" ADD COLUMN "preview_site_name" TEXT;
ALTER TABLE "feed_items" ADD COLUMN "preview_fetched_at" TIMESTAMP(3);
