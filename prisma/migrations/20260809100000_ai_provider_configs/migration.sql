-- Admin-managed AI provider configs for "Generate with AI". API keys are
-- encrypted at rest (AES-256-GCM) - the encryption key itself lives only in
-- the SETTINGS_ENCRYPTION_KEY env var, never in this table.
CREATE TYPE "AiProviderType" AS ENUM ('GEMINI', 'GROQ');

CREATE TABLE "ai_provider_configs" (
    "id" TEXT NOT NULL,
    "provider_type" "AiProviderType" NOT NULL,
    "label" TEXT NOT NULL,
    "encrypted_api_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_provider_configs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_provider_configs_enabled_priority_idx" ON "ai_provider_configs"("enabled", "priority");
