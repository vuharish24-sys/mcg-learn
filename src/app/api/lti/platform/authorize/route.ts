import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moodleCourseService } from "@/services/moodle-course.service";
import { LTI_ROLE, ltiPlatformConfig, parseLtiCustomParams, signLaunchIdToken } from "@/lib/lti-platform";

/**
 * Step 2 of the LTI launch: Moodle (the tool) redirects here with an OIDC
 * authentication request. We re-verify the caller's session and purchase,
 * mint a signed id_token, and auto-submit it back to Moodle's redirect_uri.
 */
async function handle(params: URLSearchParams) {
  const clientId = params.get("client_id");
  const redirectUri = params.get("redirect_uri");
  const loginHint = params.get("login_hint");
  const ltiMessageHint = params.get("lti_message_hint");
  const nonce = params.get("nonce");
  const state = params.get("state");

  if (!clientId || !redirectUri || !loginHint || !ltiMessageHint || !nonce) {
    return NextResponse.json({ error: "Malformed LTI authentication request" }, { status: 400 });
  }
  let expectedClientId: string, expectedRedirectUri: string;
  try {
    expectedClientId = ltiPlatformConfig.moodleClientId;
    expectedRedirectUri = ltiPlatformConfig.moodleRedirectUri;
  } catch {
    return NextResponse.json({ error: "LTI tool registration isn't configured yet" }, { status: 503 });
  }
  if (clientId !== expectedClientId) {
    return NextResponse.json({ error: "Unknown client_id" }, { status: 400 });
  }
  if (redirectUri !== expectedRedirectUri) {
    return NextResponse.json({ error: "redirect_uri does not match the registered value" }, { status: 400 });
  }

  // The browser making this request must still carry our own session
  // cookie from step 1 — login_hint alone is never trusted as proof of who
  // this is, since it travelled through the browser and Moodle unsigned.
  const user = await getApiUser();
  if (!user || user.id !== loginHint) {
    return NextResponse.json({ error: "Session mismatch — please restart the launch from MCG Learn" }, { status: 401 });
  }

  const feedItemId = ltiMessageHint;
  const [hasAccess, mapping, feedItem] = await Promise.all([
    moodleCourseService.hasAccess(user.id, feedItemId),
    moodleCourseService.getMapping(feedItemId),
    prisma.feedItem.findUnique({ where: { id: feedItemId }, select: { title: true } }),
  ]);
  if (!hasAccess || !mapping?.targetLinkUri || !feedItem) {
    return NextResponse.json({ error: "Not authorized for this course" }, { status: 403 });
  }

  const idToken = await signLaunchIdToken({
    subject: user.id,
    nonce,
    targetLinkUri: mapping.targetLinkUri,
    resourceLinkId: feedItemId,
    resourceLinkTitle: feedItem.title,
    fullName: user.fullName,
    email: user.email,
    roles: [LTI_ROLE.LEARNER],
    custom: parseLtiCustomParams(mapping.ltiCustomParams),
  });

  const escapedState = (state ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const html = `<!doctype html><html><body onload="document.forms[0].submit()">
<form method="POST" action="${redirectUri}">
<input type="hidden" name="id_token" value="${idToken}">
<input type="hidden" name="state" value="${escapedState}">
</form>
</body></html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}

export async function GET(request: Request) {
  return handle(new URL(request.url).searchParams);
}

export async function POST(request: Request) {
  const body = await request.formData();
  const params = new URLSearchParams();
  for (const [key, value] of body.entries()) params.set(key, String(value));
  return handle(params);
}
