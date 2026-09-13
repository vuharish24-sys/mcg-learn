import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { learningPathModuleUpdateSchema } from "@/lib/validation";
import { learningPathModuleService } from "@/services/learning-path-module.service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    const values = learningPathModuleUpdateSchema.parse(await request.json());
    const updated = await learningPathModuleService.update(id, {
      ...values,
      priceInPaise: values.priceInPaise === undefined ? undefined : values.priceInPaise ? Number(values.priceInPaise) : null,
    });
    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    await learningPathModuleService.delete(id);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
