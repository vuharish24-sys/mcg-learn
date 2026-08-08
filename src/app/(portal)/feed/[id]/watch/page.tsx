import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { enumLabel } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getProfileCompleteness } from "@/services/profile.service";
import { InstagramEmbed } from "@/components/feed/instagram-embed";
import { YouTubeEmbed } from "@/components/feed/youtube-embed";
import { PathItemCompleteButton } from "@/components/learning-path/path-item-complete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default async function FeedWatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ learningPathId?: string }>;
}) {
  const user = await requireUser();
  const advisingReady = getProfileCompleteness(user).isReadyForAdvising;
  const { id } = await params;
  const { learningPathId } = await searchParams;

  const item = await prisma.feedItem.findFirst({
    where: { id, status: "PUBLISHED", type: { in: ["YOUTUBE", "INSTAGRAM_REEL"] } },
  });
  if (!item) notFound();

  const path = learningPathId
    ? await prisma.learningPath.findUnique({ where: { id: learningPathId } })
    : null;

  const alreadyInPath =
    learningPathId
      ? await prisma.learningPathItem.findUnique({
          where: { learningPathId_feedItemId: { learningPathId, feedItemId: item.id } },
        })
      : null;
  if (learningPathId && !alreadyInPath) notFound();

  await prisma.feedItem.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  const backHref = path ? `/learning-paths/${path.slug}` : "/feed";
  const platformLabel = item.type === "YOUTUBE" ? "YouTube" : "Instagram";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={backHref} className="text-sm font-semibold text-teal-700">← Back</Link>
        <h1 className="mt-3 text-3xl font-bold">{item.title}</h1>
        <p className="mt-2 text-slate-500">{item.description}</p>
        <p className="mt-2 text-sm text-slate-500">{enumLabel(item.type)}</p>
        {path && <p className="mt-2 text-sm text-teal-700">Part of: {path.title}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Watch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {item.externalUrl ? (
            <>
              {item.type === "YOUTUBE" ? (
                <YouTubeEmbed url={item.externalUrl} title={item.title} />
              ) : (
                <InstagramEmbed url={item.externalUrl} />
              )}
              <a
                href={item.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <ExternalLink className="size-4" /> View on {platformLabel}
              </a>
            </>
          ) : (
            <p className="text-sm text-slate-500">No content URL is attached to this feed item.</p>
          )}
          {learningPathId && (
            <PathItemCompleteButton
              learningPathId={learningPathId}
              feedItemId={item.id}
              label="Mark as Completed"
              advisingReady={advisingReady}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
