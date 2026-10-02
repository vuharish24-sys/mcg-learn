import { AppValidationError } from "@/lib/api";
import {
  CONFIG_DEFINITIONS,
  CONFIG_GROUPS,
  clearConfigCache,
  findConfigDefinition,
  resolveConfig,
  type ConfigGroup,
} from "@/lib/app-config";
import { encryptSecret, maskSecret } from "@/lib/encryption";
import { probePracticeLab } from "@/lib/practice-lab";
import { probeRazorpay } from "@/lib/razorpay";
import { probeWordPress } from "@/lib/tutor-lms";
import { prisma } from "@/lib/prisma";

export type IntegrationConfigView = {
  key: string;
  group: ConfigGroup;
  label: string;
  secret: boolean;
  help: string | null;
  source: "env" | "database" | "default" | "unset";
  /** Masked for secrets, in full otherwise; null when unset. Never the full secret. */
  preview: string | null;
  /** Whether a database value exists, even if an env var currently overrides it. */
  hasDatabaseValue: boolean;
  updatedAt: string | null;
  updatedByEmail: string | null;
};

export const integrationConfigService = {
  async listForAdmin(): Promise<{ groups: typeof CONFIG_GROUPS; configs: IntegrationConfigView[] }> {
    clearConfigCache();
    const rows = await prisma.integrationConfig.findMany({
      select: { key: true, updatedAt: true, updatedByEmail: true },
    });
    const rowByKey = new Map(rows.map((row) => [row.key, row]));

    const configs = await Promise.all(
      CONFIG_DEFINITIONS.map(async (def) => {
        const { value, source } = await resolveConfig(def.key);
        const row = rowByKey.get(def.key);
        return {
          key: def.key,
          group: def.group,
          label: def.label,
          secret: def.secret,
          help: def.help ?? null,
          source,
          preview: value === null ? null : def.secret ? maskSecret(value) : value,
          hasDatabaseValue: Boolean(row),
          updatedAt: row?.updatedAt.toISOString() ?? null,
          updatedByEmail: row?.updatedByEmail ?? null,
        };
      }),
    );
    return { groups: CONFIG_GROUPS, configs };
  },

  async set(key: string, value: string, updatedByEmail: string) {
    if (!findConfigDefinition(key)) throw new AppValidationError("Unknown configuration key");
    const trimmed = value.trim();
    if (!trimmed) throw new AppValidationError("Value can't be empty — use Clear to remove it");
    const encryptedValue = encryptSecret(trimmed);
    await prisma.integrationConfig.upsert({
      where: { key },
      create: { key, encryptedValue, updatedByEmail },
      update: { encryptedValue, updatedByEmail },
    });
    clearConfigCache();
  },

  async clear(key: string) {
    if (!findConfigDefinition(key)) throw new AppValidationError("Unknown configuration key");
    await prisma.integrationConfig.deleteMany({ where: { key } });
    clearConfigCache();
  },

  /**
   * Makes one cheap, read-only call with the currently resolved values to
   * check they're accepted. Only groups with a safe probe are supported.
   */
  async testConnection(group: ConfigGroup): Promise<{ ok: boolean; message: string }> {
    clearConfigCache();
    if (group === "practiceLab") return probePracticeLab();
    if (group === "razorpay") return probeRazorpay();
    if (group === "wordpress") return probeWordPress();
    return { ok: false, message: "No connection test is available for this integration." };
  },
};
