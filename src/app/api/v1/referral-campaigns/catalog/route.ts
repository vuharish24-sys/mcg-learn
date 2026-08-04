import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { campaignManagementService } from "@/services/campaign-management.service";

export async function GET() {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  try {
    const [publicCampaigns, joined] = await Promise.all([
      campaignManagementService.listPublic(),
      campaignManagementService.listJoined(user.id),
    ]);
    return apiSuccess({ publicCampaigns, joined });
  } catch (error) {
    return handleApiError(error);
  }
}
