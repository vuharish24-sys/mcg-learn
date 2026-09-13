-- CreateEnum
CREATE TYPE "SessionRequestStatus" AS ENUM ('REQUESTED', 'PRICED', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'COMPLETED');

-- AlterEnum
ALTER TYPE "FeedType" ADD VALUE 'MOODLE_COURSE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PurchasableType" ADD VALUE 'MOODLE_COURSE';
ALTER TYPE "PurchasableType" ADD VALUE 'TUTOR_SESSION';

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "feed_item_id" TEXT,
ADD COLUMN     "tutor_session_request_id" TEXT;

-- CreateTable
CREATE TABLE "moodle_course_mappings" (
    "id" TEXT NOT NULL,
    "feed_item_id" TEXT NOT NULL,
    "moodle_course_id" INTEGER NOT NULL,
    "moodle_course_id_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moodle_course_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutor_session_requests" (
    "id" TEXT NOT NULL,
    "student_id" UUID NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "preferred_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "status" "SessionRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "price_amount_paise" INTEGER,
    "scheduled_at" TIMESTAMP(3),
    "meeting_url" TEXT,
    "admin_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutor_session_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "moodle_course_mappings_feed_item_id_key" ON "moodle_course_mappings"("feed_item_id");

-- CreateIndex
CREATE INDEX "tutor_session_requests_student_id_idx" ON "tutor_session_requests"("student_id");

-- CreateIndex
CREATE INDEX "tutor_session_requests_trainer_id_idx" ON "tutor_session_requests"("trainer_id");

-- CreateIndex
CREATE INDEX "tutor_session_requests_status_idx" ON "tutor_session_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_tutor_session_request_id_key" ON "purchases"("tutor_session_request_id");

-- CreateIndex
CREATE INDEX "purchases_feed_item_id_idx" ON "purchases"("feed_item_id");

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_feed_item_id_fkey" FOREIGN KEY ("feed_item_id") REFERENCES "feed_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_tutor_session_request_id_fkey" FOREIGN KEY ("tutor_session_request_id") REFERENCES "tutor_session_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moodle_course_mappings" ADD CONSTRAINT "moodle_course_mappings_feed_item_id_fkey" FOREIGN KEY ("feed_item_id") REFERENCES "feed_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_session_requests" ADD CONSTRAINT "tutor_session_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_session_requests" ADD CONSTRAINT "tutor_session_requests_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "partner_subscriptions_requesting_partner_id_target_partner_id_k" RENAME TO "partner_subscriptions_requesting_partner_id_target_partner__key";

-- RenameIndex
ALTER INDEX "trainer_assignments_trainer_id_course_module_id_compensat_key" RENAME TO "trainer_assignments_trainer_id_course_module_id_compensatio_key";

-- RenameIndex
ALTER INDEX "user_path_item_completions_user_id_learning_path_id_feed_item_i" RENAME TO "user_path_item_completions_user_id_learning_path_id_feed_it_key";

