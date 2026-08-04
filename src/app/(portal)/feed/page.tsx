import Link from "next/link";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { feedService } from "@/services/feed.service";
import { enumLabel } from "@/lib/utils";
import { feedItemFormFields, feedTypes } from "@/lib/feed-form";
import { Input, fieldClassName } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResourceCreateForm } from "@/components/forms/resource-create-form";
import { AdImpressionTracker } from "@/components/feed/ad-impression-tracker";
import { FeedPreviewCard } from "@/components/feed/feed-preview-card";

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
      <form className="grid grid-cols-1 gap-3 rounded-xl border bg-white p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-[1fr_140px_140px_110px_110px_auto] dark:border-slate-800 dark:bg-slate-900">
        <label className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-3 size-4 text-slate-400" />
          <Input className="pl-9" name="search" defaultValue={search} placeholder="Search the feed" />
        </label>
        <select className={fieldClassName} name="category" defaultValue={category ?? ""}>
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
        <select className={fieldClassName} name="type" defaultValue={type ?? ""}>
          <option value="">All types</option>
          {feedTypes.map((value) => (
            <option key={value} value={value}>
              {enumLabel(value)}
            </option>
          ))}
        </select>
        <select className={fieldClassName} name="sort" defaultValue={sort}>
          <option value="latest">Latest</option>
          <option value="popular">Popular</option>
        </select>
        <select className={fieldClassName} name="featured" defaultValue={featured ? "true" : ""}>
          <option value="">All items</option>
          <option value="true">Featured</option>
        </select>
        <Button type="submit" variant="secondary" className="w-full lg:w-auto">
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
          {items.map((item) => (
            <FeedPreviewCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
