import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Route } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getPathFeedItemHref } from "@/lib/feed-actions";
import { pathCoverImageUrl, pathPreviewImages } from "@/lib/learning-path-media";
import { feedService } from "@/services/feed.service";
import { learningPathService } from "@/services/learning-path.service";
import { LearningPathStartButton } from "@/components/learning-path/learning-path-start-button";
import { PathCurriculumRow } from "@/components/learning-path/path-curriculum-row";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaCover } from "@/components/ui/media-cover";
import { enumLabel, formatDate } from "@/lib/utils";

export default async function LearningPathDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;
  await feedService.ensureMissingPreviews(25);
  const path = await learningPathService.findByIdOrSlug(slug);
  if (!path || path.status !== "PUBLISHED") notFound();

  const detail = await learningPathService.getPathWithUserProgress(path.id, user.id);
  if (!detail) notFound();

  const { progress, itemsWithStatus } = detail;
  const started = progress?.status === "IN_PROGRESS" || progress?.status === "COMPLETED";
  const cover = pathCoverImageUrl(path, path.items);
  const previews = pathPreviewImages(path.items, 5);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/learning-paths" className="text-sm font-semibold text-teal-700">
        ← All learning paths
      </Link>

      <MediaCover
        src={cover}
        alt={path.title}
        className="aspect-[4/5] w-full rounded-2xl shadow-lg sm:aspect-[21/9] sm:min-h-[280px]"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-slate-950/25" />
        <div className="relative flex h-full min-h-0 flex-col justify-end gap-4 p-4 sm:gap-5 sm:p-6 md:p-8">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-white/90 text-teal-900">{path.category}</Badge>
            <Badge className="bg-black/45 text-white backdrop-blur-sm">{enumLabel(path.difficulty)}</Badge>
            {path.estimatedDuration != null && (
              <Badge className="bg-black/45 text-white backdrop-blur-sm">
                <Clock className="mr-1 inline size-3.5" />
                {path.estimatedDuration} min
              </Badge>
            )}
            {path.isFeatured && <Badge className="bg-amber-100 text-amber-900">Featured</Badge>}
          </div>
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold text-white sm:text-3xl md:text-4xl">{path.title}</h1>
            <p className="mt-2 line-clamp-4 text-sm leading-6 text-white/80 sm:mt-3 sm:line-clamp-none sm:text-base">
              {path.description}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
            <div className="flex items-center gap-3">
              {previews.length > 0 ? (
                <div className="flex -space-x-2">
                  {previews.map((url) => (
                    <span key={url} className="relative size-9 overflow-hidden rounded-xl border-2 border-white/70 shadow sm:size-10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
                    </span>
                  ))}
                </div>
              ) : (
                <span className="flex size-9 items-center justify-center rounded-xl bg-white/15 text-white sm:size-10">
                  <Route className="size-5" />
                </span>
              )}
              <p className="text-sm text-white/75">{path.items.length} lessons in this path</p>
            </div>
            <div className="w-full sm:w-auto [&_button]:w-full sm:[&_button]:w-auto">
              <LearningPathStartButton learningPathId={path.id} started={started} />
            </div>
          </div>
        </div>
      </MediaCover>

      {progress && (
        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-teal-700">{enumLabel(progress.status)}</p>
                <p className="text-2xl font-bold">{progress.progressPercent}% complete</p>
                {progress.completedAt && (
                  <p className="text-sm text-slate-500">Completed {formatDate(progress.completedAt)}</p>
                )}
              </div>
              <div className="h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-600 to-cyan-500"
                  style={{ width: `${progress.progressPercent}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Path curriculum</CardTitle>
          <p className="text-sm font-normal text-slate-500">
            Preview each lesson — open items to learn, then mark progress as you go.
          </p>
        </CardHeader>
        <CardContent className="divide-y px-4 dark:divide-slate-800 sm:px-6">
          {itemsWithStatus.map((item, index) => {
            const href = getPathFeedItemHref(item.feedItem.id, item.feedItem.type, path.id);
            const locked = !started && index > 0;
            return (
              <PathCurriculumRow
                key={item.id}
                index={index}
                href={href}
                locked={locked}
                isComplete={item.isComplete}
                isRequired={item.isRequired}
                bestScore={item.bestScore}
                feedItem={item.feedItem}
              />
            );
          })}
        </CardContent>
      </Card>

      {progress?.status === "COMPLETED" && (
        <Card className="border-teal-200 bg-teal-50/60 dark:border-teal-900 dark:bg-teal-950/30">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="font-semibold text-teal-800 dark:text-teal-200">Congratulations — path completed!</p>
              <p className="text-sm text-slate-500">Your certificate is available in My Achievements.</p>
            </div>
            <Link href="/my-achievements" className="text-sm font-semibold text-teal-700 hover:underline">
              View achievements →
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
