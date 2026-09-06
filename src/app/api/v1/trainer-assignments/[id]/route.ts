import { z } from "zod";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { trainerProgramService } from "@/services/trainer-program.service";

type Params = { params: Promise<{ id: string }> };
const schema = z.object({ isActive: z.coerce.boolean() });

export async function PATCH(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    const { isActive } = schema.parse(await request.json());
    const assignment = await trainerProgramService.setAssignmentActive(id, isActive);
    return apiSuccess(assignment);
  } catch (error) {
    return handleApiError(error);
  }
}
