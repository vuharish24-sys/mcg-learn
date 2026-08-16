import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contentSourceService } from "@/services/content-source.service";
import { ContentSourceManager } from "@/components/admin/content-source-manager";

export default async function AdminContentSourcesPage() {
  await requireRole(["ADMIN"]);
  const [sources, newItems, categories, learningPaths] = await Promise.all([
    contentSourceService.listForAdmin(),
    contentSourceService.listNewItems(),
    prisma.feedCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.learningPath.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm font-semibold text-teal-700">
          ← Administration
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Content Sources</h1>
        <p className="mt-1 max-w-2xl text-slate-500">
          Configure MCG&apos;s own YouTube channel, Instagram account, and blog RSS feed. Click
          &ldquo;Fetch latest&rdquo; to pull recent posts, then pick which ones become feed items or
          learning-path content — nothing is created automatically.
        </p>
      </div>
      <ContentSourceManager
        initialSources={JSON.parse(JSON.stringify(sources))}
        initialItems={JSON.parse(JSON.stringify(newItems))}
        categories={categories.map((c) => ({ value: c.id, label: c.name }))}
        learningPaths={learningPaths.map((p) => ({ value: p.id, label: p.title }))}
      />
    </div>
  );
}
