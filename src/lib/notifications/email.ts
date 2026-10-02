import { Resend } from "resend";
import { getConfig } from "@/lib/app-config";

let client: { apiKey: string; instance: Resend } | null = null;

/** Constructs the Resend client, reusing it until the key changes; null if unconfigured. */
async function getClient(): Promise<Resend | null> {
  const apiKey = await getConfig("RESEND_API_KEY");
  if (!apiKey) return null;
  if (client?.apiKey !== apiKey) client = { apiKey, instance: new Resend(apiKey) };
  return client.instance;
}

/**
 * Sends a transactional email via Resend. Silently no-ops (returns false)
 * if RESEND_API_KEY/RESEND_FROM_EMAIL aren't configured (Admin > Integrations or env) — callers treat
 * notifications as best-effort, never blocking the action that triggered them.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const [resend, from] = await Promise.all([getClient(), getConfig("RESEND_FROM_EMAIL")]);
  if (!resend || !from) {
    console.warn(`Email skipped (Resend not configured): "${subject}" to ${to}`);
    return false;
  }

  try {
    const result = await resend.emails.send({ from, to, subject, html });
    if (result.error) {
      console.error(`Resend email failed: ${result.error.message}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Resend email failed:", error instanceof Error ? error.message : error);
    return false;
  }
}
