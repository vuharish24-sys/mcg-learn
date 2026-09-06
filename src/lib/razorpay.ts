import { createHmac, timingSafeEqual } from "crypto";
import Razorpay from "razorpay";

let client: Razorpay | null | undefined;

/** Lazily constructs the Razorpay SDK client once; null if unconfigured. */
export function getRazorpayClient(): Razorpay | null {
  if (client !== undefined) return client;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  client = keyId && keySecret ? new Razorpay({ key_id: keyId, key_secret: keySecret }) : null;
  return client;
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
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  return safeEqual(hmacHex(`${orderId}|${paymentId}`, secret), signature);
}

/** Verifies the X-Razorpay-Signature header on an incoming webhook payload. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  return safeEqual(hmacHex(rawBody, secret), signature);
}
