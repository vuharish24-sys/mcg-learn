import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { referralCommissionService } from "@/services/referral-commission.service";

export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const campaignId = searchParams.get("campaignId") ?? undefined;
    const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined;
    const isAdminLike = ["ADMIN", "CAREER_OFFICER"].includes(user.role.key);
    const referrerId = isAdminLike
      ? (searchParams.get("referrerId") ?? undefined)
      : user.id;

    return apiSuccess(
      await referralCommissionService.listTransactions({
        referrerId,
        status,
        campaignId,
        from,
        to,
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
