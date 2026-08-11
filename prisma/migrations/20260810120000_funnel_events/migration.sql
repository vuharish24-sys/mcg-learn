-- Minimal conversion-funnel event log (landing-page visits for now).
CREATE TABLE "funnel_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funnel_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "funnel_events_type_created_at_idx" ON "funnel_events"("type", "created_at");
