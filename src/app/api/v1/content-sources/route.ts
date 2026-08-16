import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { contentSourceCreateSchema } from "@/lib/validation";
import { contentSourceService } from "@/services/content-source.service";

export async function GET() {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);
  return apiSuccess(await contentSourceService.listForAdmin());
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const values = contentSourceCreateSchema.parse(await request.json());
    await contentSourceService.create(values);
    return apiSuccess(await contentSourceService.listForAdmin(), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
