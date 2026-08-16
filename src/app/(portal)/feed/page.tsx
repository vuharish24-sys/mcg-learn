import Link from "next/link";
import { Search, Route, GraduationCap, Briefcase, ListChecks, Video, ChevronDown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { feedService } from "@/services/feed.service";
import { learningPathService } from "@/services/learning-path.service";
import { benefitService } from "@/services/benefit.service";
import { feedItemFormFields } from "@/lib/feed-form";
import { spaceOutAds, interleavePaths, interleaveExtra } from "@/lib/feed-merge";
import { getFeedActionHref } from "@/lib/feed-actions";
import { pathCoverImageUrl, feedItemImageUrl } from "@/lib/learning-path-media";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResourceCreateForm } from "@/components/forms/resource-create-form";
import { AdImpressionTracker } from "@/components/feed/ad-impression-tracker";
import { FeedPreviewCard } from "@/components/feed/feed-preview-card";
import { LearningPathCard } from "@/components/learning-path/learning-path-card";
import { BenefitCard, benefitHeadline } from "@/components/feed/benefit-card";
import { FeedHeroCard } from "@/components/feed/feed-hero-card";

const selectClassName =
  "h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:focus:bg-slate-900";

const CATEGORY_SHORTCUTS = [
  { label: "Learning Paths", href: "/learning-paths", icon: Route },
  { label: "Courses", href: "/feed?type=COURSE", icon: GraduationCap },
  { label: "Job Board", href: "/feed?type=JOB_POSTING", icon: Briefcase },
  { label: "Quizzes", href: "/feed?type=QUIZ", icon: ListChecks },
  { label: "Webinars", href: "/feed?type=WEBINAR", icon: Video },
];

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const search = typeof query.search === "string" ? query.search : undefined;
  const category = typeof query.category === "string" ? query.category : undefined;
  const type = typeof query.type === "string" ? query.type : undefined;
  const sort = query.sort === "popular" ? "popular" : "latest";
  const featured = query.featured === "true";
  await feedService.ensureMissingPreviews(25);
  const [items, categories] = await Promise.all([
    feedService.list({
      search,
      category,
      type,
      sort,
      featured,
      includeDrafts: user.role.key === "ADMIN",
      placement: "FEED",
    }),
    prisma.feedCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const courseIdsWithBenefit = await benefitService.getFeedItemIdsWithActiveBenefit(
    items.filter((item) => item.type === "COURSE").map((item) => item.id),
  );

  const now = new Date();
  const adIds = items
    .filter(
      (item) =>
        item.advertisement &&
        item.advertisement.status === "ACTIVE" &&
        item.advertisement.startsAt <= now &&
        item.advertisement.endsAt >= now,
    )
    .map((item) => item.advertisement!.id);

  // Only sprinkle in learning-path cards on the plain, unfiltered browse view —
  // a search or type filter means the visitor wants FeedItems specifically.
  const isDefaultBrowse = !search && !category && !type && !featured && sort === "latest";
  const { heroContinue, pathCards } = isDefaultBrowse
    ? await (async () => {
        const [continueLearning, recommended] = await Promise.all([
          learningPathService.getContinueLearning(user.id),
          learningPathService.getRecommended(user.id),
        ]);
        const continueCards = continueLearning.map((row) => ({
          key: row.learningPath.id,
          path: row.learningPath,
          href: row.continueHref ?? `/learning-paths/${row.learningPath.slug}`,
          progressPercent: row.progressPercent,
          ctaLabel: "Continue",
        }));
        // The top continue-learning card gets promoted to the hero slot instead of
        // sitting buried a few positions into the feed — everything else stays put.
        const [heroCard, ...restContinueCards] = continueCards;
        const continueIds = new Set(continueCards.map((c) => c.key));
        const recommendedCards = recommended
          .filter((path) => !continueIds.has(path.id))
          .map((path) => ({
            key: path.id,
            path,
            href: `/learning-paths/${path.slug}`,
            progressPercent: undefined as number | undefined,
            ctaLabel: "Explore",
          }));
        return {
          heroContinue: heroCard ?? null,
          pathCards: [...restContinueCards, ...recommendedCards].slice(0, 4),
        };
      })()
    : { heroContinue: null, pathCards: [] };

  const allBenefitCards = isDefaultBrowse
    ? await benefitService.listActiveMappedWithCourseCounts({ includeDrafts: user.role.key === "ADMIN" })
    : [];
  // A benefit only becomes the hero when there's no in-progress path to continue —
  // otherwise it stays in its normal spot in the interleaved stream.
  const heroBenefit = !heroContinue && allBenefitCards.length > 0 ? allBenefitCards[0] : null;
  const benefitCards = heroBenefit ? allBenefitCards.slice(1) : allBenefitCards;

  // Last resort for a learner with no progress and no active scholarship: point at
  // the featured orientation item instead of leaving the hero slot empty.
  const heroFeaturedItem =
    !heroContinue && !heroBenefit && isDefaultBrowse ? (items.find((item) => item.isFeatured) ?? null) : null;
  const itemsForFeed = heroFeaturedItem ? items.filter((item) => item.id !== heroFeaturedItem.id) : items;

  const orderedItems = isDefaultBrowse ? spaceOutAds(itemsForFeed) : itemsForFeed;
  const feedCardsWithPaths = isDefaultBrowse
    ? interleavePaths(orderedItems, pathCards, 5)
    : orderedItems.map((item) => ({ kind: "feed" as const, item }));
  const feedCards = isDefaultBrowse
    ? interleaveExtra(feedCardsWithPaths, benefitCards, (benefit) => ({ kind: "benefit" as const, benefit }), 6)
    : feedCardsWithPaths;

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdImpressionTracker advertisementIds={adIds} />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">Learning Feed</h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">Your curated medical coding and career stream.</p>
        </div>
        {user.role.key === "ADMIN" && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <Link
              href="/admin/feed"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-teal-700 hover:bg-teal-50 sm:w-auto dark:border-slate-700"
            >
              Manage feed items
            </Link>
            <ResourceCreateForm
              title="Add feed item"
              endpoint="/api/v1/feed"
              fields={feedItemFormFields(categories)}
            />
          </div>
        )}
      </div>

      {heroContinue && (
        <FeedHeroCard
          kind="continue"
          title={heroContinue.path.title}
          coverUrl={pathCoverImageUrl(heroContinue.path, heroContinue.path.items)}
          progressPercent={heroContinue.progressPercent}
          href={heroContinue.href}
        />
      )}
      {!heroContinue && heroBenefit && (
        <FeedHeroCard
          kind="benefit"
          title={heroBenefit.title}
          valueLabel={benefitHeadline(heroBenefit)}
          description={heroBenefit.description}
          imageUrl={heroBenefit.imageUrl}
          href={`/feed/benefits/${heroBenefit.id}`}
        />
      )}
      {!heroContinue && !heroBenefit && heroFeaturedItem && (
        <FeedHeroCard
          kind="start"
          title={heroFeaturedItem.title}
          description={heroFeaturedItem.description}
          coverUrl={feedItemImageUrl(heroFeaturedItem)}
          href={getFeedActionHref(heroFeaturedItem.id, heroFeaturedItem.type)}
        />
      )}

      <div className="flex flex-wrap gap-2">
        {CATEGORY_SHORTCUTS.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            prefetch={false}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-teal-800 dark:hover:bg-teal-950/40 dark:hover:text-teal-300"
          >
            <Icon className="size-4" /> {label}
          </Link>
        ))}
      </div>

      <form className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5 lg:grid-cols-[1fr_170px_140px_130px_auto] dark:border-slate-800 dark:bg-slate-900">
        {/* No visible type dropdown — category shortcuts above set this via URL; carry it forward silently so Apply doesn't drop it. */}
        {type && <input type="hidden" name="type" value={type} />}
        <label className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60"
            name="search"
            defaultValue={search}
            placeholder="Search the feed"
          />
        </label>
        <div className="relative">
          <select className={selectClassName} name="category" defaultValue={category ?? ""}>
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        </div>
        <div className="relative">
          <select className={selectClassName} name="sort" defaultValue={sort}>
            <option value="latest">Latest</option>
            <option value="popular">Popular</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        </div>
        <div className="relative">
          <select className={selectClassName} name="featured" defaultValue={featured ? "true" : ""}>
            <option value="">All items</option>
            <option value="true">Featured</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        </div>
        <Button type="submit" variant="gradient" className="w-full lg:w-auto">
          Apply
        </Button>
      </form>
      {items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500 sm:p-12">
            No feed items match these filters.
          </CardContent>
        </Card>
      ) : (
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {feedCards.map((card) =>
            card.kind === "path" ? (
              <LearningPathCard
                key={`path-${card.path.key}`}
                path={card.path.path}
                href={card.path.href}
                progressPercent={card.path.progressPercent}
                ctaLabel={card.path.ctaLabel}
              />
            ) : card.kind === "benefit" ? (
              <BenefitCard key={`benefit-${card.benefit.id}`} benefit={card.benefit} />
            ) : (
              <FeedPreviewCard
                key={card.item.id}
                item={card.item}
                hasBenefit={courseIdsWithBenefit.has(card.item.id)}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
