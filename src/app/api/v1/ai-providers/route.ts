import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { aiProviderCreateSchema } from "@/lib/validation";
import { aiProviderService } from "@/services/ai-provider.service";

export async function GET() {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);
  return apiSuccess(await aiProviderService.listForAdmin());
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const values = aiProviderCreateSchema.parse(await request.json());
    await aiProviderService.create(values);
    return apiSuccess(await aiProviderService.listForAdmin(), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
