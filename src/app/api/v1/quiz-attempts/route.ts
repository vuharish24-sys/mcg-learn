import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { quizAttemptSchema } from "@/lib/validation";
import { quizAttemptService } from "@/services/quiz-attempt.service";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const values = quizAttemptSchema.parse(await request.json());
    const result = await quizAttemptService.recordAttempt({
      userId: user.id,
      feedItemId: values.feedItemId,
      learningPathId: values.learningPathId,
      answers: values.answers,
    });
    return apiSuccess(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
