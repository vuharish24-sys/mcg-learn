import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { referralCommissionService } from "@/services/referral-commission.service";

export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const { searchParams } = new URL(request.url);
    const isAdminLike = ["ADMIN", "CAREER_OFFICER"].includes(user.role.key);
    const referrerId = isAdminLike
      ? (searchParams.get("referrerId") ?? undefined)
      : user.id;
    const campaignId = searchParams.get("campaignId") ?? undefined;
    const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined;

    if (!isAdminLike && searchParams.get("referrerId") && searchParams.get("referrerId") !== user.id) {
      return apiError("Forbidden", 403);
    }

    return apiSuccess(
      await referralCommissionService.reports({ referrerId, campaignId, from, to }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
