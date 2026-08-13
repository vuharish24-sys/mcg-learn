import { Briefcase, GraduationCap, Gift } from "lucide-react";
import { enumLabel, formatDate } from "@/lib/utils";
import { parseFeedContent } from "@/lib/feed-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FeedActionButton } from "@/components/feed/feed-action-button";
import { MediaCover } from "@/components/ui/media-cover";
import type { FeedType, PublishStatus } from "@prisma/client";

type FeedCardItem = {
  id: string;
  title: string;
  description: string;
  type: FeedType;
  status: PublishStatus;
  isFeatured: boolean;
  viewCount: number;
  publishedAt: Date | string | null;
  externalUrl: string | null;
  thumbnailUrl: string | null;
  previewTitle: string | null;
  previewDescription: string | null;
  previewImageUrl: string | null;
  previewSiteName: string | null;
  category: { name: string };
  content?: unknown;
};

function hostnameFromUrl(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function FeedPreviewCard({ item, hasBenefit }: { item: FeedCardItem; hasBenefit?: boolean }) {
  const imageUrl = item.previewImageUrl || item.thumbnailUrl;
  const displayTitle = item.title;
  const displayDescription = item.description;
  const siteLabel = item.previewSiteName || hostnameFromUrl(item.externalUrl);
  const isJob = item.type === "JOB_POSTING";
  const isCourse = item.type === "COURSE";
  const job = isJob ? parseFeedContent(item.content).job : undefined;
  const course = isCourse ? parseFeedContent(item.content).course : undefined;
  const jobMeta = job ? [job.company, job.location, job.employmentType].filter(Boolean).join(" · ") : null;
  const courseModes = course ? [...new Set(course.variants.map((v) => v.mode))].join(", ") : null;
  const courseMeta = course ? [course.instructor, courseModes].filter(Boolean).join(" · ") : null;

  return (
    <Card
      className={`group w-full overflow-hidden shadow-md ring-1 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
        isJob
          ? "border-l-4 border-violet-500 ring-slate-200/80 dark:ring-slate-800"
          : isCourse
            ? "border-l-4 border-sky-500 ring-slate-200/80 dark:ring-slate-800"
            : "border-0 ring-slate-200/80 dark:ring-slate-800"
      }`}
    >
      <MediaCover
        src={imageUrl}
        alt={displayTitle}
        fit={imageUrl ? "contain" : "cover"}
        className="aspect-square w-full bg-slate-950"
      >
        {/* Keep the photo readable while protecting overlay text */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 to-transparent" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5 sm:p-3">
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {isJob ? (
              <Badge className="gap-1 bg-violet-600 text-white shadow-sm">
                <Briefcase className="size-3" /> Job Posting
              </Badge>
            ) : isCourse ? (
              <Badge className="gap-1 bg-sky-600 text-white shadow-sm">
                <GraduationCap className="size-3" /> Course
              </Badge>
            ) : (
              <Badge className="bg-white/95 text-teal-900 shadow-sm">{enumLabel(item.type)}</Badge>
            )}
            {item.isFeatured && <Badge className="bg-amber-100 text-amber-900 shadow-sm">Featured</Badge>}
            {job?.closesAt && (
              <Badge className="bg-white/95 text-slate-700 shadow-sm">
                Closes {formatDate(job.closesAt)}
              </Badge>
            )}
            {course && course.variants.length > 1 && (
              <Badge className="bg-white/95 text-slate-700 shadow-sm">
                {course.variants.length} modes
              </Badge>
            )}
            {isCourse && hasBenefit && (
              <Badge className="gap-1 bg-amber-500 text-white shadow-sm">
                <Gift className="size-3" /> Offer
              </Badge>
            )}
          </div>
          {item.status !== "PUBLISHED" && (
            <Badge className="shrink-0 bg-black/50 text-white backdrop-blur-sm">{item.status}</Badge>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 space-y-2 p-3 text-white sm:space-y-2.5 sm:p-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-white/80 sm:text-[11px]">
            {siteLabel && (
              <span className="rounded-full bg-white/15 px-2 py-0.5 font-medium backdrop-blur-sm sm:px-2.5 sm:py-1">
                {siteLabel}
              </span>
            )}
            <span className="truncate">{item.category.name}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">{formatDate(item.publishedAt)}</span>
            <span className="ml-auto shrink-0">{item.viewCount} views</span>
          </div>
          <div>
            <h2 className="line-clamp-2 text-sm font-bold leading-snug sm:text-base lg:text-lg">
              {displayTitle}
            </h2>
            {jobMeta && (
              <p className="mt-1 truncate text-xs font-semibold text-violet-200 sm:text-sm">{jobMeta}</p>
            )}
            {courseMeta && (
              <p className="mt-1 truncate text-xs font-semibold text-sky-200 sm:text-sm">{courseMeta}</p>
            )}
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/85 sm:text-sm">
              {displayDescription}
            </p>
          </div>
          {item.status === "PUBLISHED" && (
            <div
              className={
                isJob
                  ? "[&_a]:h-9 [&_a]:w-full [&_a]:bg-violet-600 [&_a]:text-white sm:[&_a]:w-auto [&_a]:hover:bg-violet-500"
                  : isCourse
                    ? "[&_a]:h-9 [&_a]:w-full [&_a]:bg-sky-600 [&_a]:text-white sm:[&_a]:w-auto [&_a]:hover:bg-sky-500"
                    : "[&_a]:h-9 [&_a]:w-full [&_a]:bg-white [&_a]:text-teal-900 sm:[&_a]:w-auto [&_a]:hover:bg-teal-50"
              }
            >
              <FeedActionButton id={item.id} type={item.type} externalUrl={item.externalUrl} />
            </div>
          )}
        </div>
      </MediaCover>
    </Card>
  );
}
