import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProfileCompleteness } from "@/services/profile.service";
import { PathItemCompleteButton } from "@/components/learning-path/path-item-complete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default async function FeedPdfPage({
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
    where: { id, status: "PUBLISHED", type: "PDF" },
  });
  if (!item) notFound();

  const path = learningPathId
    ? await prisma.learningPath.findUnique({ where: { id: learningPathId } })
    : null;

  await prisma.feedItem.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  const backHref = path ? `/learning-paths/${path.slug}` : "/feed";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href={backHref} className="text-sm font-semibold text-teal-700">← Back</Link>
        <h1 className="mt-3 text-3xl font-bold">{item.title}</h1>
        <p className="mt-2 text-slate-500">{item.description}</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>PDF</CardTitle>
          {item.externalUrl && (
            <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Download / open
            </a>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {item.externalUrl ? (
            <iframe
              title={item.title}
              src={item.externalUrl}
              className="h-[70vh] w-full rounded-lg border dark:border-slate-800"
            />
          ) : (
            <p className="text-sm text-slate-500">No PDF URL is attached to this feed item.</p>
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
