import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { commissionTxnStatusSchema } from "@/lib/validation";
import { referralCommissionService } from "@/services/referral-commission.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!["ADMIN", "CAREER_OFFICER"].includes(user.role.key)) return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    const values = commissionTxnStatusSchema.parse(await request.json());
    return apiSuccess(
      await referralCommissionService.updateStatus(
        id,
        values.status,
        user.id,
        values.statusReason,
      ),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
