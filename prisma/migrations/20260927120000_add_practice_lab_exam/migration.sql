-- AlterEnum
ALTER TYPE "FeedType" ADD VALUE 'PRACTICE_LAB_EXAM';

-- AlterEnum
ALTER TYPE "PurchasableType" ADD VALUE 'PRACTICE_LAB_EXAM';

-- CreateTable
CREATE TABLE "practice_lab_exam_mappings" (
    "id" TEXT NOT NULL,
    "feed_item_id" TEXT NOT NULL,
    "grant_kind" TEXT NOT NULL,
    "exam_id" TEXT,
    "program_code" TEXT,
    "price_in_paise" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practice_lab_exam_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "practice_lab_exam_mappings_feed_item_id_key" ON "practice_lab_exam_mappings"("feed_item_id");

-- AddForeignKey
ALTER TABLE "practice_lab_exam_mappings" ADD CONSTRAINT "practice_lab_exam_mappings_feed_item_id_fkey" FOREIGN KEY ("feed_item_id") REFERENCES "feed_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

