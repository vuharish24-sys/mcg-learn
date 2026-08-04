import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { referralCampaignMilestoneSchema } from "@/lib/validation";
import { referralCampaignService } from "@/services/referral-commission.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ milestoneId: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);
  try {
    const { milestoneId } = await params;
    const values = referralCampaignMilestoneSchema.parse(await request.json());
    return apiSuccess(await referralCampaignService.updateMilestone(milestoneId, values, user.id));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ milestoneId: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);
  try {
    const { milestoneId } = await params;
    await referralCampaignService.deleteMilestone(milestoneId, user.id);
    return apiSuccess({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
