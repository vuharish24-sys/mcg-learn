import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { partnerSubscriptionRequestSchema } from "@/lib/validation";
import { partnerSubscriptionService } from "@/services/partner-subscription.service";

export async function GET() {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);
  return apiSuccess(await partnerSubscriptionService.listAll());
}

/**
 * Public — deliberately no auth check. Submitted from the requesting
 * partner's own /placements/[accessCode] page, which is how a partner
 * proves who they are (they have no MCG login). Creates a PENDING request
 * an admin later approves or rejects from /admin/partners.
 */
export async function POST(request: Request) {
  try {
    const values = partnerSubscriptionRequestSchema.parse(await request.json());
    const subscription = await partnerSubscriptionService.requestSubscription(values);
    return apiSuccess(subscription, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
