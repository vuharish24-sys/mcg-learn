import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { purchaseVerifySchema } from "@/lib/validation";
import { purchaseService } from "@/services/purchase.service";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const values = purchaseVerifySchema.parse(await request.json());
    const purchase = await purchaseService.verifyPayment(user.id, values);
    return apiSuccess(purchase);
  } catch (error) {
    return handleApiError(error);
  }
}
