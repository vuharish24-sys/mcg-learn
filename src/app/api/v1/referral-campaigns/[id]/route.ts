import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { referralCampaignSchema } from "@/lib/validation";
import { referralCampaignService } from "@/services/referral-commission.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!["ADMIN", "CAREER_OFFICER"].includes(user.role.key)) return apiError("Forbidden", 403);
  const { id } = await params;
  const campaign = await referralCampaignService.get(id);
  if (!campaign) return apiError("Campaign not found", 404);
  return apiSuccess(campaign);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);
  try {
    const { id } = await params;
    const values = referralCampaignSchema.parse(await request.json());
    return apiSuccess(await referralCampaignService.update(id, values, user.id));
  } catch (error) {
    return handleApiError(error);
  }
}
