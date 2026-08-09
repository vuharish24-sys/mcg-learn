import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { aiProviderUpdateSchema } from "@/lib/validation";
import { aiProviderService } from "@/services/ai-provider.service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    const values = aiProviderUpdateSchema.parse(await request.json());
    await aiProviderService.update(id, values);
    return apiSuccess(await aiProviderService.listForAdmin());
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
    await aiProviderService.delete(id);
    return apiSuccess(await aiProviderService.listForAdmin());
  } catch (error) {
    return handleApiError(error);
  }
}
