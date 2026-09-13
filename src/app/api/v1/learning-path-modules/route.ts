import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { learningPathModuleCreateSchema } from "@/lib/validation";
import { learningPathModuleService } from "@/services/learning-path-module.service";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const values = learningPathModuleCreateSchema.parse(await request.json());
    const created = await learningPathModuleService.create({
      ...values,
      priceInPaise: values.priceInPaise ? Number(values.priceInPaise) : null,
    });
    return apiSuccess(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
