-- AlterTable
ALTER TABLE "moodle_course_mappings" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "price_in_paise" INTEGER NOT NULL;

