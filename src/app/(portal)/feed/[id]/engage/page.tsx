import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { enumLabel } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getProfileCompleteness } from "@/services/profile.service";
import { PathItemCompleteButton } from "@/components/learning-path/path-item-complete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default async function FeedEngagePage({
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
    where: { id, status: "PUBLISHED" },
  });
  if (!item) notFound();

  const path = learningPathId
    ? await prisma.learningPath.findUnique({ where: { id: learningPathId } })
    : null;

  const alreadyInPath =
    learningPathId
      ? await prisma.learningPathItem.findUnique({
          where: {
            learningPathId_feedItemId: {
              learningPathId,
              feedItemId: item.id,
            },
          },
        })
      : null;

  if (learningPathId && !alreadyInPath) notFound();

  await prisma.feedItem.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  const backHref = path ? `/learning-paths/${path.slug}` : "/feed";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={backHref} className="text-sm font-semibold text-teal-700">← Back</Link>
        <h1 className="mt-3 text-3xl font-bold">{item.title}</h1>
        <p className="mt-2 text-slate-500">{item.description}</p>
        <p className="mt-2 text-sm text-slate-500">{enumLabel(item.type)}</p>
        {path && (
          <p className="mt-2 text-sm text-teal-700">Part of: {path.title}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {item.externalUrl ? (
            <>
              <p className="text-sm text-slate-500">
                Open the content in a new tab, then return here and mark it completed to update your Learning Path progress.
              </p>
              <a
                href={item.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants()}
              >
                <ExternalLink className="size-4" /> Open external content
              </a>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              No external URL is attached. You can still mark this Feed Item completed for your Learning Path.
            </p>
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
