import { decryptSecret } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";

/**
 * Integration credentials and settings that an admin can manage in the app
 * (Admin > Integrations) instead of as host env vars, so changing or
 * rotating one needs no redeploy. Stored encrypted in `integration_configs`,
 * keyed by the env var name each one replaces.
 *
 * Resolution order: env var (if set) → database → default → unset. The env
 * var wins so a developer's local `.env` can point at a test account even
 * though local and production share one database. Infrastructure settings
 * the app needs before it can read the database (DATABASE_URL, Supabase,
 * SETTINGS_ENCRYPTION_KEY, NEXT_PUBLIC_APP_URL) deliberately aren't here.
 */

export type ConfigGroup = "practiceLab" | "razorpay" | "wordpress" | "email" | "whatsapp";

export type ConfigDefinition = {
  key: string;
  group: ConfigGroup;
  label: string;
  /** Secrets are shown masked in the admin UI; non-secrets are shown in full. */
  secret: boolean;
  defaultValue?: string;
  help?: string;
};

export const CONFIG_GROUPS: Record<ConfigGroup, { label: string; description: string }> = {
  practiceLab: {
    label: "Practice Lab",
    description: "Institute API key for lab.medicalcodingglobal.com, which delivers exams and practice drills.",
  },
  razorpay: {
    label: "Razorpay",
    description: "Payment gateway keys used for checkout and to verify payments.",
  },
  wordpress: {
    label: "WordPress / Tutor LMS",
    description: "Credentials for the self-hosted WordPress + Tutor LMS site (lms.medicalcodingglobal.com).",
  },
  email: { label: "Email (Resend)", description: "Transactional email for notifications." },
  whatsapp: { label: "WhatsApp", description: "Meta WhatsApp Cloud API for appointment notifications." },
};

export const CONFIG_DEFINITIONS: ConfigDefinition[] = [
  {
    key: "PRACTICE_LAB_BASE_URL",
    group: "practiceLab",
    label: "API base URL",
    secret: false,
    defaultValue: "https://lab.medicalcodingglobal.com/api/v1",
  },
  { key: "PRACTICE_LAB_API_KEY_ID", group: "practiceLab", label: "API key ID", secret: false },
  { key: "PRACTICE_LAB_API_SECRET", group: "practiceLab", label: "API secret", secret: true },

  {
    key: "RAZORPAY_KEY_ID",
    group: "razorpay",
    label: "Key ID",
    secret: false,
    help: "Public — also sent to the browser to open checkout.",
  },
  { key: "RAZORPAY_KEY_SECRET", group: "razorpay", label: "Key secret", secret: true },
  {
    key: "RAZORPAY_WEBHOOK_SECRET",
    group: "razorpay",
    label: "Webhook secret",
    secret: true,
    help: "Set in the Razorpay dashboard for the /api/v1/webhooks/razorpay endpoint.",
  },

  { key: "WORDPRESS_BASE_URL", group: "wordpress", label: "Site URL", secret: false },
  { key: "WORDPRESS_APP_USERNAME", group: "wordpress", label: "Application Password username", secret: false },
  { key: "WORDPRESS_APP_PASSWORD", group: "wordpress", label: "Application Password", secret: true },
  { key: "MCGLEARN_WP_PLUGIN_SECRET", group: "wordpress", label: "mcglearn plugin shared secret", secret: true },

  { key: "RESEND_API_KEY", group: "email", label: "Resend API key", secret: true },
  { key: "RESEND_FROM_EMAIL", group: "email", label: "From address", secret: false },

  { key: "WHATSAPP_ACCESS_TOKEN", group: "whatsapp", label: "Access token", secret: true },
  { key: "WHATSAPP_PHONE_NUMBER_ID", group: "whatsapp", label: "Phone number ID", secret: false },
  { key: "WHATSAPP_TEMPLATE_NAME", group: "whatsapp", label: "Template name", secret: false },
];

export type ConfigKey = (typeof CONFIG_DEFINITIONS)[number]["key"];

export function findConfigDefinition(key: string): ConfigDefinition | undefined {
  return CONFIG_DEFINITIONS.find((def) => def.key === key);
}

// Short-lived per-instance cache so hot paths (every checkout, every launch)
// don't hit the database each time. A save clears it on the instance that
// handled the save; other serverless instances pick it up within the TTL.
const CACHE_TTL_MS = 60_000;
let cache: { values: Map<string, string>; loadedAt: number } | null = null;

async function loadDatabaseValues(): Promise<Map<string, string>> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache.values;
  let rows: { key: string; encryptedValue: string }[];
  try {
    rows = await prisma.integrationConfig.findMany();
  } catch (error) {
    // Treat as "nothing saved" rather than failing every caller; not cached,
    // so the next call retries.
    console.error("Unable to read integration_configs", error);
    return new Map();
  }
  const values = new Map<string, string>();
  for (const row of rows) {
    try {
      values.set(row.key, decryptSecret(row.encryptedValue));
    } catch (error) {
      console.error(`Unable to decrypt integration config ${row.key} — check SETTINGS_ENCRYPTION_KEY`, error);
    }
  }
  cache = { values, loadedAt: Date.now() };
  return values;
}

export function clearConfigCache() {
  cache = null;
}

export type ConfigSource = "env" | "database" | "default" | "unset";

export async function resolveConfig(key: ConfigKey): Promise<{ value: string | null; source: ConfigSource }> {
  const fromEnv = process.env[key];
  if (fromEnv) return { value: fromEnv, source: "env" };
  const fromDb = (await loadDatabaseValues()).get(key);
  if (fromDb) return { value: fromDb, source: "database" };
  const fallback = findConfigDefinition(key)?.defaultValue;
  if (fallback) return { value: fallback, source: "default" };
  return { value: null, source: "unset" };
}

/** The configured value, or null when it isn't set anywhere. */
export async function getConfig(key: ConfigKey): Promise<string | null> {
  return (await resolveConfig(key)).value;
}

/** The configured value; throws when it isn't set anywhere. */
export async function requireConfig(key: ConfigKey): Promise<string> {
  const value = await getConfig(key);
  if (!value) {
    throw new Error(`${key} is not configured — set it in Admin > Integrations (or as an env var).`);
  }
  return value;
}
