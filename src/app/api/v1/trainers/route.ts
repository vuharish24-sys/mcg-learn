import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { trainerSchema } from "@/lib/validation";
import { trainerService } from "@/services/trainer.service";

export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!["ADMIN", "TRAINER", "CAREER_OFFICER"].includes(user.role.key)) {
    return apiError("Forbidden", 403);
  }

  const { searchParams } = new URL(request.url);
  const trainers = await trainerService.list(
    searchParams.get("search") ?? undefined,
    searchParams.get("status") ?? undefined,
  );
  return apiSuccess(trainers);
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const values = trainerSchema.parse(await request.json());
    return apiSuccess(await trainerService.create(values), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
