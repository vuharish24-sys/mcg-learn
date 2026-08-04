import { requireUser } from "@/lib/auth";
import { feedService } from "@/services/feed.service";
import { learningPathService } from "@/services/learning-path.service";
import { LearningPathCard } from "@/components/learning-path/learning-path-card";
import { AdImpressionTracker } from "@/components/feed/ad-impression-tracker";
import { FeedPreviewCard } from "@/components/feed/feed-preview-card";
import { Card, CardContent } from "@/components/ui/card";

export default async function LearningPathsPage() {
  await requireUser();
  await feedService.ensureMissingPreviews(25);
  const [paths, promotions] = await Promise.all([
    learningPathService.list({ status: "PUBLISHED", visibility: "PUBLIC" }),
    feedService.listPromotions("LEARNING_PATH_LIST"),
  ]);
  const adIds = promotions
    .filter((item) => item.advertisement)
    .map((item) => item.advertisement!.id);

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdImpressionTracker advertisementIds={adIds} />
      <div>
        <p className="text-sm font-semibold text-teal-700">Learning Paths</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Structured learning journeys</h1>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">Complete lessons, pass the quiz, and earn your certificate.</p>
      </div>
      {promotions.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {promotions.map((item) => (
            <FeedPreviewCard key={item.id} item={item} />
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
        {paths.map((path) => (
          <LearningPathCard
            key={path.id}
            path={path}
            href={`/learning-paths/${path.slug}`}
            ctaLabel="Explore"
          />
        ))}
      </div>
      {paths.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-slate-500 sm:p-12">No published learning paths yet.</CardContent>
        </Card>
      )}
    </div>
  );
}
