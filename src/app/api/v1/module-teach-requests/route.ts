import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { moduleTeachRequestCreateSchema } from "@/lib/validation";
import { trainerService } from "@/services/trainer.service";
import { trainerProgramService } from "@/services/trainer-program.service";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const trainer = await trainerService.findByUserId(user.id);
    if (!trainer || trainer.status !== "ACTIVE") return apiError("Only active trainers can request to teach", 403);

    const values = moduleTeachRequestCreateSchema.parse(await request.json());
    const requestRow = await trainerProgramService.createTeachRequest({ trainerId: trainer.id, ...values });
    return apiSuccess(requestRow, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
