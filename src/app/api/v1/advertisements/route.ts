import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { advertisementSchema } from "@/lib/validation";
import { advertisementService } from "@/services/advertisement.service";

export async function GET() {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);
  return apiSuccess(await advertisementService.list());
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const values = advertisementSchema.parse(await request.json());
    return apiSuccess(await advertisementService.create(values), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
