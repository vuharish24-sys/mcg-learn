import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { deliverableCreateSchema } from "@/lib/validation";
import { trainerService } from "@/services/trainer.service";
import { trainerProgramService } from "@/services/trainer-program.service";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const trainer = await trainerService.findByUserId(user.id);
    if (!trainer) return apiError("No trainer profile found for this account", 403);

    const values = deliverableCreateSchema.parse(await request.json());
    const deliverable = await trainerProgramService.submitDeliverable(trainer.id, values);
    return apiSuccess(deliverable, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
