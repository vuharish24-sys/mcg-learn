-- CreateEnum
CREATE TYPE "InstallmentPlanStatus" AS ENUM ('CURRENT', 'COMPLETED', 'DEFAULTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PurchasableType" ADD VALUE 'LEARNING_PATH_MODULE';
ALTER TYPE "PurchasableType" ADD VALUE 'LEARNING_PATH_ITEM';
ALTER TYPE "PurchasableType" ADD VALUE 'INSTALLMENT';

-- DropForeignKey
ALTER TABLE "bundle_paths" DROP CONSTRAINT "bundle_paths_bundle_id_fkey";

-- DropForeignKey
ALTER TABLE "bundle_paths" DROP CONSTRAINT "bundle_paths_learning_path_id_fkey";

-- AlterTable
ALTER TABLE "learning_path_items" ADD COLUMN     "module_id" TEXT,
ADD COLUMN     "price_in_paise" INTEGER;

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "installment_id" TEXT,
ADD COLUMN     "learning_path_item_id" TEXT,
ADD COLUMN     "learning_path_module_id" TEXT;

-- DropTable
DROP TABLE "bundle_paths";

-- CreateTable
CREATE TABLE "learning_path_modules" (
    "id" TEXT NOT NULL,
    "learning_path_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "price_in_paise" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_path_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundle_items" (
    "id" TEXT NOT NULL,
    "bundle_id" TEXT NOT NULL,
    "learning_path_id" TEXT,
    "learning_path_module_id" TEXT,
    "learning_path_item_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bundle_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installment_plans" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "learning_path_id" TEXT,
    "learning_path_module_id" TEXT,
    "learning_path_item_id" TEXT,
    "total_amount_paise" INTEGER NOT NULL,
    "status" "InstallmentPlanStatus" NOT NULL DEFAULT 'CURRENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installments" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "installments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "learning_path_modules_learning_path_id_sort_order_idx" ON "learning_path_modules"("learning_path_id", "sort_order");

-- CreateIndex
CREATE INDEX "bundle_items_learning_path_id_idx" ON "bundle_items"("learning_path_id");

-- CreateIndex
CREATE INDEX "bundle_items_learning_path_module_id_idx" ON "bundle_items"("learning_path_module_id");

-- CreateIndex
CREATE INDEX "bundle_items_learning_path_item_id_idx" ON "bundle_items"("learning_path_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "bundle_items_bundle_id_learning_path_id_learning_path_modul_key" ON "bundle_items"("bundle_id", "learning_path_id", "learning_path_module_id", "learning_path_item_id");

-- CreateIndex
CREATE INDEX "installment_plans_user_id_status_idx" ON "installment_plans"("user_id", "status");

-- CreateIndex
CREATE INDEX "installment_plans_learning_path_id_idx" ON "installment_plans"("learning_path_id");

-- CreateIndex
CREATE INDEX "installment_plans_learning_path_module_id_idx" ON "installment_plans"("learning_path_module_id");

-- CreateIndex
CREATE INDEX "installment_plans_learning_path_item_id_idx" ON "installment_plans"("learning_path_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "installments_plan_id_sequence_key" ON "installments"("plan_id", "sequence");

-- CreateIndex
CREATE INDEX "learning_path_items_module_id_idx" ON "learning_path_items"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_installment_id_key" ON "purchases"("installment_id");

-- CreateIndex
CREATE INDEX "purchases_learning_path_module_id_idx" ON "purchases"("learning_path_module_id");

-- CreateIndex
CREATE INDEX "purchases_learning_path_item_id_idx" ON "purchases"("learning_path_item_id");

-- AddForeignKey
ALTER TABLE "learning_path_modules" ADD CONSTRAINT "learning_path_modules_learning_path_id_fkey" FOREIGN KEY ("learning_path_id") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_learning_path_id_fkey" FOREIGN KEY ("learning_path_id") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_learning_path_module_id_fkey" FOREIGN KEY ("learning_path_module_id") REFERENCES "learning_path_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_learning_path_item_id_fkey" FOREIGN KEY ("learning_path_item_id") REFERENCES "learning_path_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_learning_path_module_id_fkey" FOREIGN KEY ("learning_path_module_id") REFERENCES "learning_path_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_learning_path_item_id_fkey" FOREIGN KEY ("learning_path_item_id") REFERENCES "learning_path_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "installments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_learning_path_id_fkey" FOREIGN KEY ("learning_path_id") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_learning_path_module_id_fkey" FOREIGN KEY ("learning_path_module_id") REFERENCES "learning_path_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_learning_path_item_id_fkey" FOREIGN KEY ("learning_path_item_id") REFERENCES "learning_path_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installments" ADD CONSTRAINT "installments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "installment_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_items" ADD CONSTRAINT "learning_path_items_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "learning_path_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

