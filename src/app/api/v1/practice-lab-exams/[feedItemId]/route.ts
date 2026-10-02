import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { practiceLabExamMappingSchema } from "@/lib/validation";
import { practiceLabService } from "@/services/practice-lab.service";

type Params = { params: Promise<{ feedItemId: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { feedItemId } = await params;
    const values = practiceLabExamMappingSchema.parse(await request.json());
    const mapping = await practiceLabService.upsertMapping(feedItemId, values);
    return apiSuccess(mapping);
  } catch (error) {
    return handleApiError(error);
  }
}
