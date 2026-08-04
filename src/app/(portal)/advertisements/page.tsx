import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { advertisementService } from "@/services/advertisement.service";
import { enumLabel, formatDate } from "@/lib/utils";
import { ResourceCreateForm } from "@/components/forms/resource-create-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const statuses = ["DRAFT", "ACTIVE", "PAUSED", "ENDED"];

export default async function AdvertisementsPage() {
  await requireRole(["ADMIN"]);
  const [advertisements, eligibleItems] = await Promise.all([
    advertisementService.list(),
    prisma.feedItem.findMany({
      where: {
        type: { in: ["ADVERTISEMENT", "SPONSORED", "INTERNAL_PROMOTION"] },
        advertisement: null,
      },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Advertisement Manager</h1><p className="mt-1 text-slate-500">Monetization content rendered in the learning feed and, when opted in, on the learning paths list.</p></div>
        <ResourceCreateForm title="Create campaign" endpoint="/api/v1/advertisements" fields={[
          { name: "name", label: "Campaign name", required: true },
          { name: "feedItemId", label: "Feed item", type: "select", required: true, options: eligibleItems.map((item) => ({ value: item.id, label: item.title })) },
          { name: "advertiser", label: "Advertiser" },
          { name: "startsAt", label: "Starts at", type: "datetime-local", required: true },
          { name: "endsAt", label: "Ends at", type: "datetime-local", required: true },
          { name: "status", label: "Status", type: "select", defaultValue: "DRAFT", options: statuses.map((value) => ({ value, label: enumLabel(value) })) },
        ]} />
      </div>
      {eligibleItems.length === 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Create an Advertisement, Sponsored, or Internal Promotion feed item before starting another campaign.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {advertisements.map((ad) => <Card key={ad.id}><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs text-slate-500">{ad.advertiser ?? "Internal campaign"}</p><h2 className="mt-1 font-bold">{ad.name}</h2><p className="mt-1 text-sm text-slate-500">{ad.feedItem.title}</p></div><Badge>{enumLabel(ad.status)}</Badge></div><div className="mt-5 grid grid-cols-3 gap-3 border-t pt-4 text-sm dark:border-slate-800"><div><p className="text-xs text-slate-500">Schedule</p><p className="font-medium">{formatDate(ad.startsAt)} – {formatDate(ad.endsAt)}</p></div><div><p className="text-xs text-slate-500">Impressions</p><p className="font-bold">{ad.impressions}</p></div><div><p className="text-xs text-slate-500">Clicks</p><p className="font-bold">{ad.clicks}</p></div></div></CardContent></Card>)}
      </div>
      {advertisements.length === 0 && <Card><CardContent className="p-12 text-center text-slate-500">No campaigns created yet.</CardContent></Card>}
    </div>
  );
}
