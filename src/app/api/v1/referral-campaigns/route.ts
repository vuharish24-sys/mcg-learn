import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { referralCampaignSchema } from "@/lib/validation";
import { referralCampaignService } from "@/services/referral-commission.service";

export async function GET() {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!["ADMIN", "CAREER_OFFICER"].includes(user.role.key)) return apiError("Forbidden", 403);
  return apiSuccess(await referralCampaignService.list());
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);
  try {
    const values = referralCampaignSchema.parse(await request.json());
    return apiSuccess(await referralCampaignService.create(values, user.id), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
