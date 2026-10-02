-- CreateTable
CREATE TABLE "integration_configs" (
    "key" TEXT NOT NULL,
    "encrypted_value" TEXT NOT NULL,
    "updated_by_email" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("key")
);
