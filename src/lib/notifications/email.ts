import { Resend } from "resend";

let client: Resend | null | undefined;

/** Lazily constructs the Resend client once; null if unconfigured (never throws). */
function getClient(): Resend | null {
  if (client !== undefined) return client;
  const apiKey = process.env.RESEND_API_KEY;
  client = apiKey ? new Resend(apiKey) : null;
  return client;
}

/**
 * Sends a transactional email via Resend. Silently no-ops (returns false)
 * if RESEND_API_KEY/RESEND_FROM_EMAIL aren't configured — callers treat
 * notifications as best-effort, never blocking the action that triggered them.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resend = getClient();
  const from = process.env.RESEND_FROM_EMAIL;
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
