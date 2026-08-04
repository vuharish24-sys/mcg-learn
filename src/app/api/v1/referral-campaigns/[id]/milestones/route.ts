import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { referralCampaignMilestoneSchema } from "@/lib/validation";
import { referralCampaignService } from "@/services/referral-commission.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);
  try {
    const { id } = await params;
    const values = referralCampaignMilestoneSchema.parse(await request.json());
    return apiSuccess(await referralCampaignService.addMilestone(id, values, user.id), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
