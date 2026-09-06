import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { payoutMarkPaidSchema } from "@/lib/validation";
import { trainerProgramService } from "@/services/trainer-program.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    const { paymentReference } = payoutMarkPaidSchema.parse(await request.json().catch(() => ({})));
    const item = await trainerProgramService.markPayoutLineItemPaid(id, paymentReference);
    return apiSuccess(item);
  } catch (error) {
    return handleApiError(error);
  }
}
