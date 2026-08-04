import Link from "next/link";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { feedItemImageUrl } from "@/lib/learning-path-media";
import { enumLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MediaCover } from "@/components/ui/media-cover";
import type { FeedType } from "@prisma/client";

type CurriculumFeedItem = {
  id: string;
  title: string;
  type: FeedType;
  thumbnailUrl: string | null;
  previewImageUrl: string | null;
  previewTitle: string | null;
  previewDescription: string | null;
  previewSiteName: string | null;
};

export function PathCurriculumRow({
  index,
  href,
  locked,
  isComplete,
  isRequired,
  bestScore,
  feedItem,
}: {
  index: number;
  href: string;
  locked: boolean;
  isComplete: boolean;
  isRequired: boolean;
  bestScore: number | null;
  feedItem: CurriculumFeedItem;
}) {
  const imageUrl = feedItemImageUrl(feedItem);
  const title = feedItem.previewTitle || feedItem.title;
  const meta = [
    enumLabel(feedItem.type),
    isRequired ? "Required" : "Optional",
    bestScore != null ? `Best ${bestScore}%` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const previewLine = feedItem.previewDescription;

  const inner = (
    <div
      className={`flex items-start gap-3 py-3 transition sm:items-center sm:gap-4 sm:py-4 ${
        locked ? "opacity-60" : "hover:bg-slate-50/80 dark:hover:bg-slate-900/50"
      }`}
    >
      <div className="mt-1 shrink-0 text-teal-700 sm:mt-0">
        {isComplete ? (
          <CheckCircle2 className="size-5" />
        ) : locked ? (
          <Lock className="size-5 text-slate-400" />
        ) : (
          <Circle className="size-5" />
        )}
      </div>
      <MediaCover src={imageUrl} alt={title} className="size-14 shrink-0 rounded-xl shadow-sm sm:size-16">
        <div className="absolute inset-0 bg-slate-950/15" />
        <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {index + 1}
        </span>
      </MediaCover>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">{title}</p>
          <Badge className="border border-slate-200 bg-transparent text-slate-600 dark:border-slate-700">
            {enumLabel(feedItem.type)}
          </Badge>
          {feedItem.previewSiteName && (
            <span className="hidden text-xs text-slate-400 sm:inline">{feedItem.previewSiteName}</span>
          )}
        </div>
        {previewLine && (
          <p className="mt-1 line-clamp-2 hidden text-sm text-slate-500 sm:block">{previewLine}</p>
        )}
        <p className={`text-xs text-slate-500 sm:text-sm ${previewLine ? "mt-0.5" : "mt-1"}`}>{meta}</p>
        {!locked && (
          <span className="mt-2 inline-block text-sm font-semibold text-teal-700 sm:hidden">
            {isComplete ? "Review" : "Open"} →
          </span>
        )}
      </div>
      {!locked && (
        <span className="hidden shrink-0 text-sm font-semibold text-teal-700 sm:inline">
          {isComplete ? "Review" : "Open"} →
        </span>
      )}
    </div>
  );

  if (locked) return inner;
  return (
    <Link href={href} className="block px-0 sm:px-1">
      {inner}
    </Link>
  );
}
