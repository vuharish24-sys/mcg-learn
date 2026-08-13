import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { benefitUpdateSchema } from "@/lib/validation";
import { benefitService } from "@/services/benefit.service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    const values = benefitUpdateSchema.parse(await request.json());
    const benefit = await benefitService.update(id, {
      ...values,
      ...(values.code !== undefined ? { code: values.code || null } : {}),
      ...(values.description !== undefined ? { description: values.description || null } : {}),
      ...(values.imageUrl !== undefined ? { imageUrl: values.imageUrl || null } : {}),
    });
    return apiSuccess(benefit);
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
    await benefitService.delete(id);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
