import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { joinCampaignSchema } from "@/lib/validation";
import { campaignManagementService } from "@/services/campaign-management.service";
import { referralProfileService } from "@/services/referral-profile.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  try {
    const { code } = await params;
    const campaign = await campaignManagementService.getByCodeOrId(code);
    if (!campaign) return apiError("Campaign not found", 404);
    const profile = await referralProfileService.getByUserId(user.id);
    return apiSuccess({
      campaign,
      share: campaignManagementService.shareLinks(campaign, profile?.referralCode),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  try {
    const { code } = await params;
    const campaign = await campaignManagementService.getByCodeOrId(code);
    if (!campaign) return apiError("Campaign not found", 404);
    const values = joinCampaignSchema.parse(await request.json());
    const participant = await campaignManagementService.joinCampaign(
      user.id,
      campaign.id,
      values.termsAccepted,
    );
    return apiSuccess(participant, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
