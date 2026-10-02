import { NextResponse } from "next/server";
import { apiError, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { practiceLabService } from "@/services/practice-lab.service";

type Params = { params: Promise<{ feedItemId: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const { feedItemId } = await params;
    const hasAccess = await practiceLabService.hasAccess(user.id, feedItemId);
    if (!hasAccess) return apiError("You haven't purchased this", 403);

    const loginUrl = await practiceLabService.getLaunchUrl(user.id, feedItemId);
    return NextResponse.redirect(loginUrl);
  } catch (error) {
    return handleApiError(error);
  }
}
