import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { courseModuleUpdateSchema } from "@/lib/validation";
import { trainerProgramService } from "@/services/trainer-program.service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    const values = courseModuleUpdateSchema.parse(await request.json());
    const courseModule = await trainerProgramService.updateModule(id, values);
    return apiSuccess(courseModule);
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
    await trainerProgramService.deleteModule(id);
    return apiSuccess({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
