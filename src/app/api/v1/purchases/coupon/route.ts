import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { couponQuoteSchema } from "@/lib/validation";
import { purchaseService } from "@/services/purchase.service";

/** Preview: what this learner would pay for this item with this coupon. Checkout re-checks it anyway. */
export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const values = couponQuoteSchema.parse(await request.json());
    return apiSuccess(await purchaseService.quoteCoupon(user.id, values.purchasableType, values.id, values.code));
  } catch (error) {
    return handleApiError(error);
  }
}
