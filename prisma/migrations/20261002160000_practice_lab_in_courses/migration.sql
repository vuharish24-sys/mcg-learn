-- CreateEnum
CREATE TYPE "PracticeLabAccessMode" AS ENUM ('INCLUDED', 'EXTRA');

-- CreateEnum
CREATE TYPE "PracticeLabCompletionRule" AS ENUM ('ON_PASS', 'ON_FINISH', 'MANUAL');

-- AlterTable
ALTER TABLE "learning_path_items" ADD COLUMN     "lab_access_mode" "PracticeLabAccessMode" NOT NULL DEFAULT 'INCLUDED',
ADD COLUMN     "lab_completion_rule" "PracticeLabCompletionRule" NOT NULL DEFAULT 'MANUAL';

