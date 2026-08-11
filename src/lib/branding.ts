import { prisma } from "@/lib/prisma";

const LOGO_SETTING_KEY = "branding.logo_url";

export { LOGO_SETTING_KEY };

/** Server-only — reads directly via Prisma so anonymous pages (landing, login) can use it without hitting the auth-gated settings API. */
export async function getBrandingLogoUrl(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key: LOGO_SETTING_KEY } });
  const value = typeof setting?.value === "string" ? setting.value.trim() : "";
  return value || null;
}
