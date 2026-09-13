import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bundleItemLabel, bundleService } from "@/services/bundle.service";
import { BundleForm, type BundleItemOption } from "@/components/forms/bundle-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminBundlesPage() {
  await requireRole(["ADMIN"]);
  const [bundles, paidPaths, paidModules, paidItems] = await Promise.all([
    bundleService.list(),
    prisma.learningPath.findMany({
      where: { priceInPaise: { not: null } },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.learningPathModule.findMany({
      where: { priceInPaise: { not: null } },
      select: { id: true, title: true, learningPath: { select: { title: true } } },
      orderBy: { title: "asc" },
    }),
    prisma.learningPathItem.findMany({
      where: { priceInPaise: { not: null } },
      select: { id: true, feedItem: { select: { title: true } }, learningPath: { select: { title: true } } },
      orderBy: { feedItem: { title: "asc" } },
    }),
  ]);

  const itemOptions: BundleItemOption[] = [
    ...paidPaths.map((p) => ({ type: "LEARNING_PATH" as const, id: p.id, label: p.title })),
    ...paidModules.map((m) => ({
      type: "LEARNING_PATH_MODULE" as const,
      id: m.id,
      label: `${m.title} (module of ${m.learningPath.title})`,
    })),
    ...paidItems.map((i) => ({
      type: "LEARNING_PATH_ITEM" as const,
      id: i.id,
      label: `${i.feedItem.title} (lesson in ${i.learningPath.title})`,
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-teal-700">← Administration</Link>
          <h1 className="mt-2 text-3xl font-bold">Bundles</h1>
          <p className="mt-1 max-w-2xl text-slate-500">
            Combine paid courses, modules, and lessons — any mix — into a package sold at one price via Razorpay.
          </p>
        </div>
        <BundleForm itemOptions={itemOptions} />
      </div>

      <div className="grid gap-4">
        {bundles.map((bundle) => (
          <Card key={bundle.id}>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>{bundle.title}</CardTitle>
                <p className="mt-1 text-sm text-slate-500">/{bundle.slug} · ₹{(bundle.priceInPaise / 100).toLocaleString("en-IN")}</p>
              </div>
              <Badge className={bundle.isActive ? "" : "bg-slate-100 text-slate-500"}>
                {bundle.isActive ? "Active" : "Inactive"}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-1.5">
                {bundle.items.map((item) => (
                  <Badge key={item.id} className="border border-slate-200 bg-transparent text-slate-600 dark:border-slate-700">
                    {bundleItemLabel(item)}
                  </Badge>
                ))}
              </div>
              <BundleForm
                bundleId={bundle.id}
                itemOptions={itemOptions}
                initial={{
                  title: bundle.title,
                  slug: bundle.slug,
                  description: bundle.description,
                  priceInPaise: bundle.priceInPaise,
                  isActive: bundle.isActive,
                  items: bundle.items.map((item) => ({
                    type: item.learningPathId
                      ? ("LEARNING_PATH" as const)
                      : item.learningPathModuleId
                        ? ("LEARNING_PATH_MODULE" as const)
                        : ("LEARNING_PATH_ITEM" as const),
                    id: (item.learningPathId ?? item.learningPathModuleId ?? item.learningPathItemId)!,
                  })),
                }}
              />
            </CardContent>
          </Card>
        ))}
      </div>
      {bundles.length === 0 && (
        <Card><CardContent className="p-12 text-center text-slate-500">No bundles yet.</CardContent></Card>
      )}
    </div>
  );
}
