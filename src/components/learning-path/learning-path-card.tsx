import Link from "next/link";
import { Clock, Route } from "lucide-react";
import { pathCoverImageUrl, pathPreviewImages } from "@/lib/learning-path-media";
import { enumLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MediaCover } from "@/components/ui/media-cover";
import type { FeedType, LearningPathDifficulty } from "@prisma/client";

type PathCardItem = {
  feedItem: {
    title: string;
    type: FeedType;
    thumbnailUrl: string | null;
    previewImageUrl: string | null;
  };
};

export type LearningPathCardPath = {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  category: string;
  difficulty: LearningPathDifficulty;
  estimatedDuration: number | null;
  isFeatured: boolean;
  items: PathCardItem[];
};

export function LearningPathCard({
  path,
  href,
  progressPercent,
  ctaLabel = "View path",
}: {
  path: LearningPathCardPath;
  href: string;
  progressPercent?: number;
  ctaLabel?: string;
}) {
  const cover = pathCoverImageUrl(path, path.items);
  const previews = pathPreviewImages(path.items, 4);

  return (
    <Link href={href} prefetch={false} className="group block h-full w-full">
      <Card className="h-full w-full overflow-hidden border-0 shadow-md ring-1 ring-slate-200/80 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:ring-slate-800">
        <MediaCover
          src={cover}
          alt={path.title}
          fit={cover ? "contain" : "cover"}
          className="aspect-square w-full bg-slate-950"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/15 transition duration-300 group-hover:from-slate-950/95" />

          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5 sm:p-3">
            <Badge className="max-w-[55%] truncate bg-white/90 text-teal-900 shadow-sm">{path.category}</Badge>
            <div className="flex flex-wrap justify-end gap-1.5">
              {path.isFeatured && <Badge className="bg-amber-100 text-amber-900 shadow-sm">Featured</Badge>}
              <Badge className="bg-black/45 text-white backdrop-blur-sm">{enumLabel(path.difficulty)}</Badge>
            </div>
          </div>

          {!cover && (
            <div className="absolute inset-0 flex items-center justify-center text-white/50">
              <Route className="size-12 sm:size-14" />
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 space-y-2 p-3 text-white sm:space-y-2.5 sm:p-4">
            {previews.length > 1 && (
              <div className="flex -space-x-2">
                {previews.map((url) => (
                  <span
                    key={url}
                    className="relative size-7 overflow-hidden rounded-lg border-2 border-white/70 shadow-md sm:size-8"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" referrerPolicy="no-referrer" className="size-full object-cover object-center" />
                  </span>
                ))}
              </div>
            )}
            <div>
              <h2 className="line-clamp-2 text-sm font-bold leading-snug drop-shadow-sm sm:text-base lg:text-lg">
                {path.title}
              </h2>
              <p className="mt-1 line-clamp-2 hidden text-sm leading-5 text-white/80 min-[380px]:block">
                {path.description}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/75">
              <span>{path.items.length} lessons</span>
              {path.estimatedDuration != null && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" /> {path.estimatedDuration} min
                </span>
              )}
              <span className="ml-auto font-semibold text-white">{ctaLabel} →</span>
            </div>
            {progressPercent != null && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-white/80">
                  <span>Progress</span>
                  <span className="font-semibold">{progressPercent}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-teal-300 transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </MediaCover>
      </Card>
    </Link>
  );
}
