import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { moodleCourseService } from "@/services/moodle-course.service";
import { ltiPlatformConfig } from "@/lib/lti-platform";

type Params = { params: Promise<{ feedItemId: string }> };

/**
 * Step 1 of the LTI launch: verify the learner has paid, then redirect them
 * to Moodle's login-initiation URL per the "third party initiated login"
 * pattern. Moodle will redirect back to /api/lti/platform/authorize next.
 */
export async function GET(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  const { feedItemId } = await params;
  const mapping = await moodleCourseService.getMapping(feedItemId);
  if (!mapping || !mapping.isActive) return apiError("Course not found", 404);
  if (!mapping.targetLinkUri) {
    return apiError("This course hasn't finished being registered with Moodle yet — contact the site admin.", 409);
  }

  const hasAccess = await moodleCourseService.hasAccess(user.id, feedItemId);
  if (!hasAccess) return apiError("Purchase this course to access it", 403);

  try {
    const loginInit = new URL(ltiPlatformConfig.moodleLoginInitUrl);
    loginInit.searchParams.set("iss", ltiPlatformConfig.issuer);
    loginInit.searchParams.set("login_hint", user.id);
    loginInit.searchParams.set("target_link_uri", mapping.targetLinkUri);
    loginInit.searchParams.set("client_id", ltiPlatformConfig.moodleClientId);
    // Carried through unchanged by the tool and echoed back to us in the
    // authorize step, so we know which feed item/course this launch is for.
    loginInit.searchParams.set("lti_message_hint", feedItemId);

    return NextResponse.redirect(loginInit.toString());
  } catch {
    // Thrown by ltiPlatformConfig's env accessors when the LTI tool
    // registration (docs/MOODLE_SELF_HOSTING.md Phase 5) hasn't been
    // completed yet — a real, expected state, not a bug.
    return apiError("This course's LMS launch isn't configured yet — contact the site admin.", 503);
  }
}
