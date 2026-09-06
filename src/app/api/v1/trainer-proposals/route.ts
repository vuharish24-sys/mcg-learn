import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { trainerProposalCreateSchema } from "@/lib/validation";
import { trainerService } from "@/services/trainer.service";
import { trainerProgramService } from "@/services/trainer-program.service";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const trainer = await trainerService.findByUserId(user.id);
    if (!trainer || trainer.status !== "ACTIVE") return apiError("Only active trainers can submit proposals", 403);

    const values = trainerProposalCreateSchema.parse(await request.json());
    const proposal = await trainerProgramService.createProposal({ trainerId: trainer.id, ...values });
    return apiSuccess(proposal, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
