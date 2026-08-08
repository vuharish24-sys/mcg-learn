import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { getFeedActionKind } from "@/lib/feed-actions";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await params;
  const item = await prisma.feedItem.findFirst({
    where: { id, status: "PUBLISHED" },
    include: { advertisement: true },
  });
  if (!item) return apiError("Feed item not found", 404);

  const origin = new URL(request.url).origin;
  const learningPathId = new URL(request.url).searchParams.get("learningPathId");
  const kind = getFeedActionKind(item.type);
  const redirectsInternally =
    kind === "quiz" || kind === "pdf" || kind === "webinar" || kind === "career" || kind === "watch";

  await prisma.$transaction(async (tx) => {
    if (!redirectsInternally && !(learningPathId && item.externalUrl)) {
      await tx.feedItem.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
    }

    if (item.advertisement) {
      const now = new Date();
      await tx.advertisement.updateMany({
        where: {
          id: item.advertisement.id,
          status: "ACTIVE",
          startsAt: { lte: now },
          endsAt: { gte: now },
        },
        data: { clicks: { increment: 1 } },
      });
    }
  });

  function withPathQuery(pathname: string) {
    const url = new URL(pathname, origin);
    if (learningPathId) url.searchParams.set("learningPathId", learningPathId);
    return url;
  }

  if (kind === "quiz") {
    return NextResponse.redirect(withPathQuery(`/feed/${id}/quiz`));
  }
  if (kind === "pdf") {
    return NextResponse.redirect(withPathQuery(`/feed/${id}/pdf`));
  }
  if (kind === "webinar") {
    return NextResponse.redirect(withPathQuery(`/feed/${id}/webinar`));
  }
  if (kind === "career") {
    return NextResponse.redirect(withPathQuery(`/feed/${id}/career`));
  }
  if (kind === "watch") {
    return NextResponse.redirect(withPathQuery(`/feed/${id}/watch`));
  }

  // From a Learning Path, keep the learner in-app so they can mark completion.
  if (learningPathId) {
    return NextResponse.redirect(withPathQuery(`/feed/${id}/engage`));
  }

  if (item.externalUrl) {
    return NextResponse.redirect(item.externalUrl);
  }

  return NextResponse.redirect(new URL("/feed", origin));
}
