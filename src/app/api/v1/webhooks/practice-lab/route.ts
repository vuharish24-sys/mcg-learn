import { apiError, apiSuccess } from "@/lib/api";
import { verifyPracticeLabWebhook, type PracticeLabAttempt } from "@/lib/practice-lab";
import { prisma } from "@/lib/prisma";
import { practiceLabService } from "@/services/practice-lab.service";

type AttemptCompletedPayload = {
  attempt?: PracticeLabAttempt & { learner?: { id?: string; external_ref?: string } };
};

/**
 * The Lab's attempt.completed webhook — completes Practice Lab lessons in a
 * learner's courses as soon as the attempt is graded, instead of on their
 * next visit. No user session; trust is the HMAC signature
 * (PRACTICE_LAB_WEBHOOK_SECRET). Safe to receive twice: completion is
 * idempotent, so retries need no dedupe.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const valid = await verifyPracticeLabWebhook(
    rawBody,
    request.headers.get("x-lab-timestamp"),
    request.headers.get("x-lab-signature"),
  );
  if (!valid) return apiError("Invalid signature", 401);

  if (request.headers.get("x-lab-event") !== "attempt.completed") return apiSuccess({ ignored: true });

  let payload: AttemptCompletedPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const externalRef = payload.attempt?.learner?.external_ref;
  // external_ref is our user id. Without it (older Lab payloads) there's no
  // way to tell whose attempt this is; their next visit picks it up instead.
  if (!payload.attempt || !externalRef) return apiSuccess({ ignored: true });

  const user = await prisma.user.findUnique({ where: { id: externalRef }, select: { id: true } }).catch(() => null);
  if (!user) return apiSuccess({ ignored: true });

  const completed = await practiceLabService.syncCompletions(user.id, { attempts: [payload.attempt] });
  return apiSuccess({ completed });
}
