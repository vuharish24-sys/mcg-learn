-- AlterEnum
BEGIN;
CREATE TYPE "FeedType_new" AS ENUM ('ARTICLE', 'YOUTUBE', 'INSTAGRAM_REEL', 'PDF', 'QUIZ', 'CAREER_TIP', 'ANNOUNCEMENT', 'WEBINAR', 'ADVERTISEMENT', 'SPONSORED', 'INTERNAL_PROMOTION', 'JOB_POSTING', 'COURSE', 'TUTOR_LMS_COURSE');
ALTER TABLE "feed_items" ALTER COLUMN "type" TYPE "FeedType_new" USING ("type"::text::"FeedType_new");
ALTER TYPE "FeedType" RENAME TO "FeedType_old";
ALTER TYPE "FeedType_new" RENAME TO "FeedType";
DROP TYPE "public"."FeedType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PurchasableType_new" AS ENUM ('LEARNING_PATH', 'BUNDLE', 'TUTOR_LMS_COURSE', 'TUTOR_SESSION');
ALTER TABLE "purchases" ALTER COLUMN "purchasable_type" TYPE "PurchasableType_new" USING ("purchasable_type"::text::"PurchasableType_new");
ALTER TYPE "PurchasableType" RENAME TO "PurchasableType_old";
ALTER TYPE "PurchasableType_new" RENAME TO "PurchasableType";
DROP TYPE "public"."PurchasableType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "moodle_course_mappings" DROP CONSTRAINT "moodle_course_mappings_feed_item_id_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "wordpress_user_id" INTEGER;

-- DropTable
DROP TABLE "moodle_course_mappings";

-- CreateTable
CREATE TABLE "tutor_lms_course_mappings" (
    "id" TEXT NOT NULL,
    "feed_item_id" TEXT NOT NULL,
    "tutor_course_id" INTEGER NOT NULL,
    "price_in_paise" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutor_lms_course_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tutor_lms_course_mappings_feed_item_id_key" ON "tutor_lms_course_mappings"("feed_item_id");

-- AddForeignKey
ALTER TABLE "tutor_lms_course_mappings" ADD CONSTRAINT "tutor_lms_course_mappings_feed_item_id_fkey" FOREIGN KEY ("feed_item_id") REFERENCES "feed_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

