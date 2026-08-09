import type { AiProviderType, Prisma } from "@prisma/client";
import { AppValidationError } from "@/lib/api";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";

export type AiProviderConfigForAdmin = {
  id: string;
  providerType: AiProviderType;
  label: string;
  enabled: boolean;
  priority: number;
  lastUsedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  keyPreview: string;
};

export const aiProviderService = {
  /** Enabled configs in try-order, with the real key decrypted — server-side use only, never returned to a client. */
  listEnabledWithKeys() {
    return prisma.aiProviderConfig
      .findMany({ where: { enabled: true }, orderBy: [{ priority: "asc" }, { createdAt: "asc" }] })
      .then((rows) => rows.map((row) => ({ ...row, apiKey: decryptSecret(row.encryptedApiKey) })));
  },

  hasAnyConfigured() {
    return prisma.aiProviderConfig.count().then((count) => count > 0);
  },

  async recordSuccess(id: string) {
    await prisma.aiProviderConfig.update({
      where: { id },
      data: { lastUsedAt: new Date(), lastError: null },
    });
  },

  async recordFailure(id: string, message: string) {
    await prisma.aiProviderConfig.update({
      where: { id },
      data: { lastError: message.slice(0, 500) },
    });
  },

  /** Admin listing — decrypts only long enough to compute a masked preview, never exposes the real key. */
  async listForAdmin(): Promise<AiProviderConfigForAdmin[]> {
    const rows = await prisma.aiProviderConfig.findMany({
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
    return rows.map((row) => {
      let keyPreview = "•••• (unreadable — check SETTINGS_ENCRYPTION_KEY)";
      try {
        keyPreview = maskSecret(decryptSecret(row.encryptedApiKey));
      } catch {
        // key rotated/misconfigured since this row was saved — surface it, don't crash the list
      }
      return {
        id: row.id,
        providerType: row.providerType,
        label: row.label,
        enabled: row.enabled,
        priority: row.priority,
        lastUsedAt: row.lastUsedAt,
        lastError: row.lastError,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        keyPreview,
      };
    });
  },

  async create(input: {
    providerType: AiProviderType;
    label: string;
    apiKey: string;
    enabled: boolean;
    priority: number;
  }) {
    if (!input.apiKey.trim()) throw new AppValidationError("API key is required");
    const created = await prisma.aiProviderConfig.create({
      data: {
        providerType: input.providerType,
        label: input.label.trim(),
        encryptedApiKey: encryptSecret(input.apiKey.trim()),
        enabled: input.enabled,
        priority: input.priority,
      },
    });
    return created.id;
  },

  async update(
    id: string,
    input: { label?: string; apiKey?: string; enabled?: boolean; priority?: number },
  ) {
    const data: Prisma.AiProviderConfigUpdateInput = {};
    if (input.label !== undefined) data.label = input.label.trim();
    if (input.enabled !== undefined) data.enabled = input.enabled;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.apiKey !== undefined && input.apiKey.trim()) {
      data.encryptedApiKey = encryptSecret(input.apiKey.trim());
      data.lastError = null;
    }
    const existing = await prisma.aiProviderConfig.findUnique({ where: { id } });
    if (!existing) throw new AppValidationError("Provider config not found");
    await prisma.aiProviderConfig.update({ where: { id }, data });
  },

  async delete(id: string) {
    const existing = await prisma.aiProviderConfig.findUnique({ where: { id } });
    if (!existing) throw new AppValidationError("Provider config not found");
    await prisma.aiProviderConfig.delete({ where: { id } });
  },
};
