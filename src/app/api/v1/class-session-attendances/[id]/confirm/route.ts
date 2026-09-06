import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { trainerProgramService } from "@/services/trainer-program.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const { id } = await params;
    const attendance = await trainerProgramService.confirmAttendance(user.id, id);
    return apiSuccess(attendance);
  } catch (error) {
    return handleApiError(error);
  }
}
