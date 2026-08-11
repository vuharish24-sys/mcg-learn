-- Board viewing is now gated by a per-partner candidate allowlist (matched
-- by email/phone) instead of being open to anyone holding the accessCode
-- link. managementCode is a second, distinct secret link the partner's own
-- staff use to add candidates, so the student-facing accessCode link can
-- never grant that power.
ALTER TABLE "partners" ADD COLUMN "management_code" TEXT;
UPDATE "partners" SET "management_code" = md5(random()::text || clock_timestamp()::text) WHERE "management_code" IS NULL;
ALTER TABLE "partners" ALTER COLUMN "management_code" SET NOT NULL;
CREATE UNIQUE INDEX "partners_management_code_key" ON "partners"("management_code");

CREATE TABLE "partner_candidates" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "full_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "first_login_at" TIMESTAMP(3),
    "enrolled_at" TIMESTAMP(3),
    "session_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_candidates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_candidates_session_token_key" ON "partner_candidates"("session_token");
CREATE INDEX "partner_candidates_partner_id_email_idx" ON "partner_candidates"("partner_id", "email");
CREATE INDEX "partner_candidates_partner_id_phone_idx" ON "partner_candidates"("partner_id", "phone");

ALTER TABLE "partner_candidates" ADD CONSTRAINT "partner_candidates_partner_id_fkey"
    FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
