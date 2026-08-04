import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { commissionCalculateSchema } from "@/lib/validation";
import { referralCommissionService } from "@/services/referral-commission.service";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!["ADMIN", "CAREER_OFFICER"].includes(user.role.key)) return apiError("Forbidden", 403);

  try {
    const values = commissionCalculateSchema.parse(await request.json());
    return apiSuccess(await referralCommissionService.calculate(values, user.id), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
