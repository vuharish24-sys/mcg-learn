import { apiError, apiSuccess } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { learningPathService } from "@/services/learning-path.service";

export async function GET() {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  return apiSuccess(await learningPathService.getMyLearning(user.id));
}
