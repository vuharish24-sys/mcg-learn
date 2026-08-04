"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Route } from "lucide-react";
import { FeedPreviewCard } from "@/components/feed/feed-preview-card";
import {
  LearningPathCard,
  type LearningPathCardPath,
} from "@/components/learning-path/learning-path-card";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
};

type ContinueItem = {
  learningPath: LearningPathCardPath;
  progressPercent: number;
  continueHref: string | null;
};

const tabs = [
  { id: "courses" as const, label: "Courses", icon: Route },
  { id: "feed" as const, label: "Learning Feed", icon: BookOpen },
];

export function DashboardLearningTabs({
  courses,
  continueLearning = [],
  feedItems,
  coursesHref = "/learning-paths",
  feedHref = "/feed",
}: {
  courses: LearningPathCardPath[];
  continueLearning?: ContinueItem[];
  feedItems: FeedCardItem[];
  coursesHref?: string;
  feedHref?: string;
}) {
  const [active, setActive] = useState<(typeof tabs)[number]["id"]>("courses");

  const continueIds = new Set(continueLearning.map((row) => row.learningPath.id));
  const otherCourses = courses.filter((course) => !continueIds.has(course.id));

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Learning content"
          className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900 sm:w-auto"
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active === id}
              onClick={() => setActive(id)}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition sm:flex-none",
                active === id
                  ? "bg-white text-teal-800 shadow-sm dark:bg-slate-800 dark:text-teal-300"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
        <Link
          href={active === "courses" ? coursesHref : feedHref}
          className="text-sm font-semibold text-teal-700"
        >
          View all →
        </Link>
      </div>

      {active === "courses" ? (
        <div className="space-y-5" role="tabpanel">
          {continueLearning.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-500">Continue learning</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {continueLearning.map(({ learningPath, progressPercent, continueHref }) => (
                  <LearningPathCard
                    key={learningPath.id}
                    path={learningPath}
                    href={continueHref ?? `/learning-paths/${learningPath.slug}`}
                    progressPercent={progressPercent}
                    ctaLabel="Continue"
                  />
                ))}
              </div>
            </div>
          )}

          {otherCourses.length > 0 ? (
            <div className="space-y-3">
              {continueLearning.length > 0 && (
                <h3 className="text-sm font-semibold text-slate-500">Explore courses</h3>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {otherCourses.map((path) => (
                  <LearningPathCard
                    key={path.id}
                    path={path}
                    href={`/learning-paths/${path.slug}`}
                    ctaLabel="Explore"
                  />
                ))}
              </div>
            </div>
          ) : null}

          {continueLearning.length === 0 && otherCourses.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-slate-500">
                No courses published yet.{" "}
                <Link href={coursesHref} className="font-semibold text-teal-700 hover:underline">
                  Browse learning paths
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div role="tabpanel">
          {feedItems.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-slate-500">
                No published feed content yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {feedItems.map((item) => (
                <FeedPreviewCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
