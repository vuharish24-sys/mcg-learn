import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { commissionPaymentSchema } from "@/lib/validation";
import { referralCommissionService } from "@/services/referral-commission.service";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const values = commissionPaymentSchema.parse(await request.json());
    return apiSuccess(await referralCommissionService.recordPayment(values, user.id), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
