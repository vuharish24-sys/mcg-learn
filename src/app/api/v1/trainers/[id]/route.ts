import { z } from "zod";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { trainerService } from "@/services/trainer.service";

const schema = z.object({ status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]) });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);
  try {
    const { id } = await params;
    return apiSuccess(await trainerService.update(id, schema.parse(await request.json())));
  } catch (error) {
    return handleApiError(error);
  }
}
