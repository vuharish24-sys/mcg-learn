import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { bundleCreateSchema } from "@/lib/validation";
import { bundleService } from "@/services/bundle.service";

export async function GET() {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  return apiSuccess(user.role.key === "ADMIN" ? await bundleService.list() : await bundleService.listActive());
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const values = bundleCreateSchema.parse(await request.json());
    const bundle = await bundleService.create(values);
    return apiSuccess(bundle, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
