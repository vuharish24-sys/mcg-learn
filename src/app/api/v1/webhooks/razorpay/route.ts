import { apiError, apiSuccess } from "@/lib/api";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { purchaseService } from "@/services/purchase.service";

type RazorpayWebhookPayload = {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
      };
    };
  };
};

/**
 * Server-to-server confirmation from Razorpay — the reliable source of truth
 * if a learner closes the tab right after paying, before the client-side
 * verify call (POST /api/v1/purchases/verify) fires. No user session here;
 * trust is entirely the HMAC signature on the raw body.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature");
  const rawBody = await request.text();

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return apiError("Invalid signature", 401);
  }

  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return apiError("Invalid payload", 400);
  }

  if (payload.event === "payment.captured") {
    const paymentId = payload.payload?.payment?.entity?.id;
    const orderId = payload.payload?.payment?.entity?.order_id;
    if (orderId && paymentId) {
      await purchaseService.markPaidFromWebhook(orderId, paymentId);
    }
  }

  return apiSuccess({ ok: true });
}
