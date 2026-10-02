import { createHmac, timingSafeEqual } from "crypto";
import Razorpay from "razorpay";
import { getConfig } from "@/lib/app-config";

let client: { keyId: string; keySecret: string; instance: Razorpay } | null = null;

/** Constructs the Razorpay SDK client, reusing it until the configured keys change; null if unconfigured. */
export async function getRazorpayClient(): Promise<Razorpay | null> {
  const [keyId, keySecret] = await Promise.all([getConfig("RAZORPAY_KEY_ID"), getConfig("RAZORPAY_KEY_SECRET")]);
  if (!keyId || !keySecret) return null;
  if (client?.keyId !== keyId || client.keySecret !== keySecret) {
    client = { keyId, keySecret, instance: new Razorpay({ key_id: keyId, key_secret: keySecret }) };
  }
  return client.instance;
}

/** The public key ID the browser needs to open checkout. Same value as the server's key ID. */
export async function getRazorpayPublicKeyId(): Promise<string | null> {
  return (await getConfig("RAZORPAY_KEY_ID")) ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? null;
}

function hmacHex(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Verifies the signature Razorpay's checkout returns to the client after a successful payment. */
export async function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): Promise<boolean> {
  const secret = await getConfig("RAZORPAY_KEY_SECRET");
  if (!secret) return false;
  return safeEqual(hmacHex(`${orderId}|${paymentId}`, secret), signature);
}

/** Verifies the X-Razorpay-Signature header on an incoming webhook payload. */
export async function verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
  const secret = await getConfig("RAZORPAY_WEBHOOK_SECRET");
  if (!secret) return false;
  return safeEqual(hmacHex(rawBody, secret), signature);
}

/** Admin > Integrations "Test connection": a read-only call that lists at most one order. */
export async function probeRazorpay(): Promise<{ ok: boolean; message: string }> {
  const razorpay = await getRazorpayClient();
  if (!razorpay) return { ok: false, message: "Key ID and key secret are both required." };
  try {
    await razorpay.orders.all({ count: 1 });
    const webhook = await getConfig("RAZORPAY_WEBHOOK_SECRET");
    return {
      ok: true,
      message: webhook
        ? "Connected — Razorpay accepted the key ID and secret."
        : "Connected — but no webhook secret is set, so payments only confirm through the browser callback.",
    };
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    return { ok: false, message: status === 401 ? "Rejected (401): wrong key ID or key secret." : `Razorpay call failed${status ? ` (${status})` : ""}.` };
  }
}
