import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { courseModuleCreateSchema } from "@/lib/validation";
import { trainerProgramService } from "@/services/trainer-program.service";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const values = courseModuleCreateSchema.parse(await request.json());
    const courseModule = await trainerProgramService.createModule(values);
    return apiSuccess(courseModule, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
