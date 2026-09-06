import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { trainerAssignmentCreateSchema } from "@/lib/validation";
import { trainerProgramService } from "@/services/trainer-program.service";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const values = trainerAssignmentCreateSchema.parse(await request.json());
    const assignment = await trainerProgramService.createAssignment(values);
    return apiSuccess(assignment, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
