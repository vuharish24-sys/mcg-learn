import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bundleService } from "@/services/bundle.service";
import { BundleForm } from "@/components/forms/bundle-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminBundlesPage() {
  await requireRole(["ADMIN"]);
  const [bundles, paidPaths] = await Promise.all([
    bundleService.list(),
    prisma.learningPath.findMany({
      where: { priceInPaise: { not: null } },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-teal-700">← Administration</Link>
          <h1 className="mt-2 text-3xl font-bold">Bundles</h1>
          <p className="mt-1 max-w-2xl text-slate-500">
            Combine paid learning paths into a package sold at one price via Razorpay.
          </p>
        </div>
        <BundleForm learningPaths={paidPaths} />
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
                {bundle.paths.map((bp) => (
                  <Badge key={bp.learningPathId} className="border border-slate-200 bg-transparent text-slate-600 dark:border-slate-700">
                    {bp.learningPath.title}
                  </Badge>
                ))}
              </div>
              <BundleForm
                bundleId={bundle.id}
                learningPaths={paidPaths}
                initial={{
                  title: bundle.title,
                  slug: bundle.slug,
                  description: bundle.description,
                  priceInPaise: bundle.priceInPaise,
                  isActive: bundle.isActive,
                  learningPathIds: bundle.paths.map((bp) => bp.learningPathId),
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
