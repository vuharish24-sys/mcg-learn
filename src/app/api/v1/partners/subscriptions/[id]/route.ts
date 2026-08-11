import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { partnerSubscriptionStatusSchema } from "@/lib/validation";
import { partnerSubscriptionService } from "@/services/partner-subscription.service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    const { status } = partnerSubscriptionStatusSchema.parse(await request.json());
    const subscription = await partnerSubscriptionService.setStatus(id, status);
    return apiSuccess(subscription);
  } catch (error) {
    return handleApiError(error);
  }
}
