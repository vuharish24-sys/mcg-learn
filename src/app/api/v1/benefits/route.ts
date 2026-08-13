import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { benefitCreateSchema } from "@/lib/validation";
import { benefitService } from "@/services/benefit.service";

export async function GET() {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);
  return apiSuccess(await benefitService.list());
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const values = benefitCreateSchema.parse(await request.json());
    const benefit = await benefitService.create({
      ...values,
      code: values.code || null,
      description: values.description || null,
      imageUrl: values.imageUrl || null,
    });
    return apiSuccess(benefit, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
