import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { feedService } from "@/services/feed.service";
import { enumLabel, formatDate } from "@/lib/utils";
import { feedItemFormFields, feedItemInitialValues } from "@/lib/feed-form";
import { ResourceCreateForm } from "@/components/forms/resource-create-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminFeedPage() {
  await requireRole(["ADMIN"]);
  await feedService.ensureMissingPreviews(25);
  const [items, categories] = await Promise.all([
    feedService.list({ includeDrafts: true, sort: "latest" }),
    prisma.feedCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  const fields = feedItemFormFields(categories);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-teal-700">
            ← Administration
          </Link>
          <h1 className="mt-2 text-3xl font-bold">Feed Item Management</h1>
          <p className="mt-1 text-slate-500">Create, edit, publish, and delete Learning Feed posts.</p>
        </div>
        <ResourceCreateForm title="Add feed item" endpoint="/api/v1/feed" fields={fields} />
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  {item.category.name} · {enumLabel(item.type)} · {item.viewCount} views
                  {item.publishedAt ? ` · ${formatDate(item.publishedAt)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{enumLabel(item.status)}</Badge>
                {item.isFeatured && (
                  <Badge className="border border-slate-200 bg-transparent text-slate-600 dark:border-slate-700">
                    Featured
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <p className="line-clamp-2 max-w-2xl text-sm text-slate-500">{item.description}</p>
              <ResourceCreateForm
                title="Edit feed item"
                editLabel="Edit"
                endpoint={`/api/v1/feed/${item.id}`}
                method="PATCH"
                allowDelete
                fields={fields}
                initialValues={feedItemInitialValues(item)}
              />
            </CardContent>
          </Card>
        ))}
      </div>
      {items.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-slate-500">No feed items yet.</CardContent>
        </Card>
      )}
    </div>
  );
}
