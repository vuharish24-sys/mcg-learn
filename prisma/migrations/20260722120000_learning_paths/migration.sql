-- CreateEnum
CREATE TYPE "LearningPathStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "LearningPathVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "LearningPathDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
CREATE TYPE "UserLearningStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "certificates" ADD COLUMN "learning_path_id" TEXT;

-- CreateTable
CREATE TABLE "learning_paths" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "estimated_duration" INTEGER,
    "difficulty" "LearningPathDifficulty" NOT NULL DEFAULT 'BEGINNER',
    "category" TEXT NOT NULL,
    "status" "LearningPathStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "LearningPathVisibility" NOT NULL DEFAULT 'PUBLIC',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "required_quiz_feed_item_id" TEXT,
    "quiz_pass_percentage" INTEGER NOT NULL DEFAULT 60,
    "certificate_template" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "learning_path_items" (
    "id" TEXT NOT NULL,
    "learning_path_id" TEXT NOT NULL,
    "feed_item_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "pass_percentage" INTEGER,

    CONSTRAINT "learning_path_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_learning_progress" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "learning_path_id" TEXT NOT NULL,
    "status" "UserLearningStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "last_activity_at" TIMESTAMP(3),

    CONSTRAINT "user_learning_progress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_path_item_completions" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "learning_path_id" TEXT NOT NULL,
    "feed_item_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_path_item_completions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quiz_attempts" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "feed_item_id" TEXT NOT NULL,
    "learning_path_id" TEXT,
    "score" INTEGER NOT NULL,
    "total_questions" INTEGER NOT NULL,
    "percentage" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "learning_paths_slug_key" ON "learning_paths"("slug");
CREATE INDEX "learning_paths_status_visibility_idx" ON "learning_paths"("status", "visibility");
CREATE UNIQUE INDEX "learning_path_items_learning_path_id_feed_item_id_key" ON "learning_path_items"("learning_path_id", "feed_item_id");
CREATE INDEX "learning_path_items_learning_path_id_sort_order_idx" ON "learning_path_items"("learning_path_id", "sort_order");
CREATE UNIQUE INDEX "user_learning_progress_user_id_learning_path_id_key" ON "user_learning_progress"("user_id", "learning_path_id");
CREATE INDEX "user_learning_progress_user_id_status_idx" ON "user_learning_progress"("user_id", "status");
CREATE UNIQUE INDEX "user_path_item_completions_user_id_learning_path_id_feed_item_id_key" ON "user_path_item_completions"("user_id", "learning_path_id", "feed_item_id");
CREATE INDEX "user_path_item_completions_learning_path_id_idx" ON "user_path_item_completions"("learning_path_id");
CREATE INDEX "quiz_attempts_user_id_feed_item_id_learning_path_id_idx" ON "quiz_attempts"("user_id", "feed_item_id", "learning_path_id");
CREATE UNIQUE INDEX "certificates_learner_id_learning_path_id_key" ON "certificates"("learner_id", "learning_path_id");
CREATE INDEX "certificates_learning_path_id_idx" ON "certificates"("learning_path_id");

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_learning_path_id_fkey" FOREIGN KEY ("learning_path_id") REFERENCES "learning_paths"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_required_quiz_feed_item_id_fkey" FOREIGN KEY ("required_quiz_feed_item_id") REFERENCES "feed_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "learning_path_items" ADD CONSTRAINT "learning_path_items_learning_path_id_fkey" FOREIGN KEY ("learning_path_id") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "learning_path_items" ADD CONSTRAINT "learning_path_items_feed_item_id_fkey" FOREIGN KEY ("feed_item_id") REFERENCES "feed_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_learning_progress" ADD CONSTRAINT "user_learning_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_learning_progress" ADD CONSTRAINT "user_learning_progress_learning_path_id_fkey" FOREIGN KEY ("learning_path_id") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_path_item_completions" ADD CONSTRAINT "user_path_item_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_path_item_completions" ADD CONSTRAINT "user_path_item_completions_learning_path_id_fkey" FOREIGN KEY ("learning_path_id") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_path_item_completions" ADD CONSTRAINT "user_path_item_completions_feed_item_id_fkey" FOREIGN KEY ("feed_item_id") REFERENCES "feed_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_feed_item_id_fkey" FOREIGN KEY ("feed_item_id") REFERENCES "feed_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_learning_path_id_fkey" FOREIGN KEY ("learning_path_id") REFERENCES "learning_paths"("id") ON DELETE SET NULL ON UPDATE CASCADE;
