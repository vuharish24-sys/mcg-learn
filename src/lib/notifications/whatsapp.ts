/**
 * Sends a WhatsApp template message via the Meta Graph API. Silently no-ops
 * (returns false) if the WhatsApp env vars aren't configured. Only template
 * messages are supported — Meta requires a pre-approved template for any
 * business-initiated message (i.e. one not sent within 24h of the user
 * messaging first), which is the case for every appointment notification.
 *
 * `params` fills the template's numbered body placeholders ({{1}}, {{2}}, ...)
 * in order — their meaning depends entirely on whatever template is approved
 * in Meta Business Manager for WHATSAPP_TEMPLATE_NAME.
 */
export async function sendWhatsAppTemplate(toE164: string, params: string[]): Promise<boolean> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;

  if (!accessToken || !phoneNumberId || !templateName) {
    console.warn(`WhatsApp message skipped (not configured): template for ${toE164}`);
    return false;
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toE164,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: params.map((text) => ({ type: "text", text })),
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`WhatsApp send failed (${response.status}): ${body.slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("WhatsApp send failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

/** Best-effort E.164 normalization for Indian numbers (the app's primary audience). Returns null if it can't be confident. */
export function toE164(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (phone.startsWith("+")) return digits;
  return null;
}
