import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pathCoverImageUrl, pathPreviewImages } from "@/lib/learning-path-media";
import { feedService } from "@/services/feed.service";
import { learningPathService } from "@/services/learning-path.service";
import { LearningPathForm } from "@/components/learning-path/learning-path-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaCover } from "@/components/ui/media-cover";
import { enumLabel } from "@/lib/utils";

export default async function AdminLearningPathsPage() {
  await requireRole(["ADMIN"]);
  await feedService.ensureMissingPreviews(25);
  const [paths, feedItems] = await Promise.all([
    learningPathService.list(),
    prisma.feedItem.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, type: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const feedOptions = feedItems.map((item) => ({ value: item.id, label: item.title, type: item.type }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-teal-700">← Administration</Link>
          <h1 className="mt-2 text-3xl font-bold">Learning Path Management</h1>
          <p className="mt-1 text-slate-500">Create, publish, and organize structured learning journeys.</p>
        </div>
        <LearningPathForm feedItems={feedOptions} endpoint="/api/v1/learning-paths" />
      </div>

      <div className="grid gap-4">
        {paths.map((path) => {
          const cover = pathCoverImageUrl(path, path.items);
          const previews = pathPreviewImages(path.items, 4);
          return (
            <Card key={path.id} className="overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                <MediaCover src={cover} alt={path.title} className="h-36 shrink-0 sm:h-auto sm:w-44">
                  <div className="absolute inset-0 bg-slate-950/25" />
                  {previews.length > 1 && (
                    <div className="absolute bottom-2 left-2 flex -space-x-1.5">
                      {previews.map((url) => (
                        <span key={url} className="relative size-7 overflow-hidden rounded-md border border-white/70">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
                        </span>
                      ))}
                    </div>
                  )}
                </MediaCover>
                <div className="min-w-0 flex-1">
                  <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
                    <div>
                      <CardTitle>{path.title}</CardTitle>
                      <p className="mt-1 text-sm text-slate-500">
                        /{path.slug} · {path.items.length} items · Pass {path.quizPassPercentage}%
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{enumLabel(path.status)}</Badge>
                      <Badge className="border border-slate-200 bg-transparent text-slate-600 dark:border-slate-700">
                        {enumLabel(path.visibility)}
                      </Badge>
                      {path.isFeatured && (
                        <Badge className="border border-slate-200 bg-transparent text-slate-600 dark:border-slate-700">
                          Featured
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center justify-between gap-4">
                    <p className="line-clamp-2 max-w-2xl text-sm text-slate-500">{path.description}</p>
                    <LearningPathForm
                      feedItems={feedOptions}
                      endpoint={`/api/v1/learning-paths/${path.id}`}
                      method="PATCH"
                      initial={{
                        title: path.title,
                        slug: path.slug,
                        description: path.description,
                        thumbnailUrl: path.thumbnailUrl ?? "",
                        estimatedDuration: path.estimatedDuration?.toString() ?? "",
                        difficulty: path.difficulty,
                        category: path.category,
                        status: path.status,
                        visibility: path.visibility,
                        isFeatured: path.isFeatured,
                        requiredQuizFeedItemId: path.requiredQuizFeedItemId ?? "",
                        quizPassPercentage: String(path.quizPassPercentage),
                        certificateTemplate: path.certificateTemplate ?? "",
                        items: path.items.map((item) => ({
                          feedItemId: item.feedItemId,
                          sortOrder: item.sortOrder,
                          isRequired: item.isRequired,
                          passPercentage: item.passPercentage?.toString() ?? "",
                        })),
                      }}
                    />
                  </CardContent>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {paths.length === 0 && <Card><CardContent className="p-12 text-center text-slate-500">No learning paths yet.</CardContent></Card>}
    </div>
  );
}
