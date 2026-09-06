import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { bundleUpdateSchema } from "@/lib/validation";
import { bundleService } from "@/services/bundle.service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    const values = bundleUpdateSchema.parse(await request.json());
    const bundle = await bundleService.update(id, values);
    return apiSuccess(bundle);
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
    await bundleService.delete(id);
    return apiSuccess({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
