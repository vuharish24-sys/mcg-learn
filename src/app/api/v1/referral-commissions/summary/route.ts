import { apiError, apiSuccess } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { referralCommissionService } from "@/services/referral-commission.service";

export async function GET() {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  const isAdminLike = ["ADMIN", "CAREER_OFFICER"].includes(user.role.key);
  return apiSuccess(await referralCommissionService.summary(isAdminLike ? undefined : user.id));
}
