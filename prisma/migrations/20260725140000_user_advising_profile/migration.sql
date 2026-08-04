-- AlterTable: lightweight advising profile fields on users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "date_of_birth" DATE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "qualification" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "field_of_study" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "years_experience" INTEGER;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "career_goal" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_learning_mode" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "advising_notes" TEXT;
