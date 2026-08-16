-- CreateEnum
CREATE TYPE "ContentSourcePlatform" AS ENUM ('YOUTUBE', 'INSTAGRAM', 'RSS');

-- CreateEnum
CREATE TYPE "ContentSourceItemStatus" AS ENUM ('NEW', 'IMPORTED', 'DISMISSED');

-- CreateTable
CREATE TABLE "content_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "ContentSourcePlatform" NOT NULL,
    "handle" TEXT NOT NULL,
    "encrypted_api_key" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_fetched_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_source_items" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail_url" TEXT,
    "external_url" TEXT NOT NULL,
    "published_at" TIMESTAMP(3),
    "status" "ContentSourceItemStatus" NOT NULL DEFAULT 'NEW',
    "imported_feed_item_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_source_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_source_items_status_idx" ON "content_source_items"("status");

-- CreateIndex
CREATE INDEX "content_source_items_imported_feed_item_id_idx" ON "content_source_items"("imported_feed_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_source_items_source_id_external_id_key" ON "content_source_items"("source_id", "external_id");

-- AddForeignKey
ALTER TABLE "content_source_items" ADD CONSTRAINT "content_source_items_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "content_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_source_items" ADD CONSTRAINT "content_source_items_imported_feed_item_id_fkey" FOREIGN KEY ("imported_feed_item_id") REFERENCES "feed_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
