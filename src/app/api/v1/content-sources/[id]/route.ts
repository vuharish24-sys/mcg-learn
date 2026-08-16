import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { contentSourceUpdateSchema } from "@/lib/validation";
import { contentSourceService } from "@/services/content-source.service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    const values = contentSourceUpdateSchema.parse(await request.json());
    await contentSourceService.update(id, values);
    return apiSuccess(await contentSourceService.listForAdmin());
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
    await contentSourceService.delete(id);
    return apiSuccess(await contentSourceService.listForAdmin());
  } catch (error) {
    return handleApiError(error);
  }
}
