-- CreateEnum
CREATE TYPE "TrainerCompensationType" AS ENUM ('HOURLY', 'FLAT_PER_SESSION', 'FLAT_PER_DELIVERABLE', 'PER_STUDENT_USE');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "TeachRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ClassSessionStatus" AS ENUM ('PENDING_CONFIRMATION', 'CONFIRMED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "DeliverableStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "PayoutLineStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayoutSourceType" AS ENUM ('CLASS_SESSION', 'DELIVERABLE', 'CONTENT_USAGE');

-- CreateTable
CREATE TABLE "course_modules" (
    "id" TEXT NOT NULL,
    "feed_item_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_assignments" (
    "id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "course_module_id" TEXT NOT NULL,
    "compensation_type" "TrainerCompensationType" NOT NULL,
    "rate_amount_paise" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainer_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_proposals" (
    "id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "target_course_id" TEXT,
    "proposed_compensation_type" "TrainerCompensationType" NOT NULL,
    "proposed_rate_amount_paise" INTEGER NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "admin_notes" TEXT,
    "resulting_module_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainer_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_teach_requests" (
    "id" TEXT NOT NULL,
    "course_module_id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "proposed_compensation_type" "TrainerCompensationType" NOT NULL,
    "proposed_rate_amount_paise" INTEGER NOT NULL,
    "status" "TeachRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "module_teach_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_sessions" (
    "id" TEXT NOT NULL,
    "trainer_assignment_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "meeting_url" TEXT,
    "notes" TEXT,
    "status" "ClassSessionStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_session_attendances" (
    "id" TEXT NOT NULL,
    "class_session_id" TEXT NOT NULL,
    "student_id" UUID NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_session_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverables" (
    "id" TEXT NOT NULL,
    "trainer_assignment_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "file_url" TEXT,
    "status" "DeliverableStatus" NOT NULL DEFAULT 'SUBMITTED',
    "admin_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_module_completions" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "course_module_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_module_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_usage_events" (
    "id" TEXT NOT NULL,
    "trainer_assignment_id" TEXT NOT NULL,
    "student_id" UUID NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_payout_line_items" (
    "id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "source_type" "PayoutSourceType" NOT NULL,
    "class_session_id" TEXT,
    "deliverable_id" TEXT,
    "content_usage_event_id" TEXT,
    "amount_paise" INTEGER NOT NULL,
    "status" "PayoutLineStatus" NOT NULL DEFAULT 'PENDING',
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "payment_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trainer_payout_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_modules_feed_item_id_idx" ON "course_modules"("feed_item_id");

-- CreateIndex
CREATE INDEX "trainer_assignments_course_module_id_idx" ON "trainer_assignments"("course_module_id");

-- CreateIndex
CREATE UNIQUE INDEX "trainer_assignments_trainer_id_course_module_id_compensat_key" ON "trainer_assignments"("trainer_id", "course_module_id", "compensation_type");

-- CreateIndex
CREATE INDEX "trainer_proposals_trainer_id_idx" ON "trainer_proposals"("trainer_id");

-- CreateIndex
CREATE INDEX "trainer_proposals_status_idx" ON "trainer_proposals"("status");

-- CreateIndex
CREATE INDEX "module_teach_requests_course_module_id_idx" ON "module_teach_requests"("course_module_id");

-- CreateIndex
CREATE INDEX "module_teach_requests_trainer_id_idx" ON "module_teach_requests"("trainer_id");

-- CreateIndex
CREATE INDEX "class_sessions_trainer_assignment_id_idx" ON "class_sessions"("trainer_assignment_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_session_attendances_class_session_id_student_id_key" ON "class_session_attendances"("class_session_id", "student_id");

-- CreateIndex
CREATE INDEX "deliverables_trainer_assignment_id_idx" ON "deliverables"("trainer_assignment_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_module_completions_user_id_course_module_id_key" ON "user_module_completions"("user_id", "course_module_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_usage_events_trainer_assignment_id_student_id_key" ON "content_usage_events"("trainer_assignment_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "trainer_payout_line_items_class_session_id_key" ON "trainer_payout_line_items"("class_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "trainer_payout_line_items_deliverable_id_key" ON "trainer_payout_line_items"("deliverable_id");

-- CreateIndex
CREATE UNIQUE INDEX "trainer_payout_line_items_content_usage_event_id_key" ON "trainer_payout_line_items"("content_usage_event_id");

-- CreateIndex
CREATE INDEX "trainer_payout_line_items_trainer_id_status_idx" ON "trainer_payout_line_items"("trainer_id", "status");

-- AddForeignKey
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_feed_item_id_fkey" FOREIGN KEY ("feed_item_id") REFERENCES "feed_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_assignments" ADD CONSTRAINT "trainer_assignments_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_assignments" ADD CONSTRAINT "trainer_assignments_course_module_id_fkey" FOREIGN KEY ("course_module_id") REFERENCES "course_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_proposals" ADD CONSTRAINT "trainer_proposals_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_proposals" ADD CONSTRAINT "trainer_proposals_target_course_id_fkey" FOREIGN KEY ("target_course_id") REFERENCES "feed_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_teach_requests" ADD CONSTRAINT "module_teach_requests_course_module_id_fkey" FOREIGN KEY ("course_module_id") REFERENCES "course_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_teach_requests" ADD CONSTRAINT "module_teach_requests_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_trainer_assignment_id_fkey" FOREIGN KEY ("trainer_assignment_id") REFERENCES "trainer_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_session_attendances" ADD CONSTRAINT "class_session_attendances_class_session_id_fkey" FOREIGN KEY ("class_session_id") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_session_attendances" ADD CONSTRAINT "class_session_attendances_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_trainer_assignment_id_fkey" FOREIGN KEY ("trainer_assignment_id") REFERENCES "trainer_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_module_completions" ADD CONSTRAINT "user_module_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_module_completions" ADD CONSTRAINT "user_module_completions_course_module_id_fkey" FOREIGN KEY ("course_module_id") REFERENCES "course_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_usage_events" ADD CONSTRAINT "content_usage_events_trainer_assignment_id_fkey" FOREIGN KEY ("trainer_assignment_id") REFERENCES "trainer_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_usage_events" ADD CONSTRAINT "content_usage_events_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_payout_line_items" ADD CONSTRAINT "trainer_payout_line_items_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_payout_line_items" ADD CONSTRAINT "trainer_payout_line_items_class_session_id_fkey" FOREIGN KEY ("class_session_id") REFERENCES "class_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_payout_line_items" ADD CONSTRAINT "trainer_payout_line_items_deliverable_id_fkey" FOREIGN KEY ("deliverable_id") REFERENCES "deliverables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_payout_line_items" ADD CONSTRAINT "trainer_payout_line_items_content_usage_event_id_fkey" FOREIGN KEY ("content_usage_event_id") REFERENCES "content_usage_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
