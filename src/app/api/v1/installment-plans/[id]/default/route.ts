import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { installmentPlanService } from "@/services/installment-plan.service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    const plan = await installmentPlanService.markDefaulted(id);
    return apiSuccess(plan);
  } catch (error) {
    return handleApiError(error);
  }
}
