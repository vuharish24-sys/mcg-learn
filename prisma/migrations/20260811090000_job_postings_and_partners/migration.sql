-- New feed type for the job board / placement support system.
ALTER TYPE "FeedType" ADD VALUE 'JOB_POSTING';

-- Partner institutes get white-labeled, time-boxed access to the job board
-- via a single unguessable link — no account required for their students.
CREATE TYPE "PartnerStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "access_code" TEXT NOT NULL,
    "status" "PartnerStatus" NOT NULL DEFAULT 'ACTIVE',
    "access_starts_at" TIMESTAMP(3),
    "access_ends_at" TIMESTAMP(3),
    "contact_name" TEXT,
    "contact_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partners_slug_key" ON "partners"("slug");
CREATE UNIQUE INDEX "partners_access_code_key" ON "partners"("access_code");
