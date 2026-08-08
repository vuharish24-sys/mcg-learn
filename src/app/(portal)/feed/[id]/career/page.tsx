import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProfileCompleteness } from "@/services/profile.service";
import { FeedLeadForm } from "@/components/feed/feed-lead-form";
import { PathItemCompleteButton } from "@/components/learning-path/path-item-complete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function FeedCareerPage({
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
    where: { id, status: "PUBLISHED", type: "CAREER_TIP" },
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={backHref} className="text-sm font-semibold text-teal-700">← Back</Link>
        <h1 className="mt-3 text-3xl font-bold">{item.title}</h1>
        <p className="mt-2 text-slate-500">{item.description}</p>
        {path && <p className="mt-2 text-sm text-teal-700">Part of: {path.title}</p>}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Book career guidance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FeedLeadForm
            endpoint={`/api/v1/feed/${id}/register`}
            submitLabel="Book career guidance"
            defaultName={user.fullName}
            defaultEmail={user.email}
            defaultPhone={user.phone ?? undefined}
          />
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
