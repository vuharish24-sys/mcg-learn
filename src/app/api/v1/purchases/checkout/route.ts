import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { purchaseCheckoutSchema } from "@/lib/validation";
import { purchaseService } from "@/services/purchase.service";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const values = purchaseCheckoutSchema.parse(await request.json());
    const order = await purchaseService.createOrder(user.id, values.purchasableType, values.id);
    return apiSuccess(order, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
