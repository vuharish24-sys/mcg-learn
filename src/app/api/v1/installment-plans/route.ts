import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { installmentPlanCreateSchema } from "@/lib/validation";
import { installmentPlanService } from "@/services/installment-plan.service";

export async function GET() {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  return apiSuccess(
    user.role.key === "ADMIN" ? await installmentPlanService.list() : await installmentPlanService.listMine(user.id),
  );
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const values = installmentPlanCreateSchema.parse(await request.json());
    const plan = await installmentPlanService.create(values);
    return apiSuccess(plan, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
