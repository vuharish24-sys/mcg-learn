-- CreateEnum
CREATE TYPE "LearningPathRewardType" AS ENUM ('CERTIFICATE', 'BADGE');

-- AlterTable
ALTER TABLE "learning_paths" ADD COLUMN "reward_type" "LearningPathRewardType" NOT NULL DEFAULT 'CERTIFICATE';
ALTER TABLE "learning_paths" ADD COLUMN "badge_icon" TEXT;

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "learner_id" UUID NOT NULL,
    "learning_path_id" TEXT,
    "path_title" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🏅',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "badges_learner_id_idx" ON "badges"("learner_id");

-- CreateIndex
CREATE INDEX "badges_learning_path_id_idx" ON "badges"("learning_path_id");

-- CreateIndex
CREATE UNIQUE INDEX "badges_learner_id_learning_path_id_key" ON "badges"("learner_id", "learning_path_id");

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_learning_path_id_fkey" FOREIGN KEY ("learning_path_id") REFERENCES "learning_paths"("id") ON DELETE SET NULL ON UPDATE CASCADE;
