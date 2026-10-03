import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "@/lib/app-config";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { createHmac } from "node:crypto";

test("an env var wins over the database and the default", async () => {
  process.env.PRACTICE_LAB_BASE_URL = "https://override.example.test/api/v1";
  assert.deepEqual(await resolveConfig("PRACTICE_LAB_BASE_URL"), { value: "https://override.example.test/api/v1", source: "env" });
});

test("Razorpay webhook signature is hex HMAC of the raw body", async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = "rzp-unit";
  const body = '{"event":"payment.captured"}';
  const sig = createHmac("sha256", "rzp-unit").update(body).digest("hex");
  assert.equal(await verifyWebhookSignature(body, sig), true);
  assert.equal(await verifyWebhookSignature(body, sig.replace(/.$/, "0")), false);
});
