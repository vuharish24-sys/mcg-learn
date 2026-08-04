import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enumLabel, formatDate } from "@/lib/utils";
import { referralCampaignService } from "@/services/referral-commission.service";
import { CampaignForm } from "@/components/referral-commission/campaign-form";
import { MilestoneForm } from "@/components/referral-commission/milestone-form";
import { CampaignManagePanel } from "@/components/referral-commission/campaign-manage-panel";
import { CampaignAssetGallery } from "@/components/referral-commission/campaign-asset-gallery";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function toLocalInput(value: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { id } = await params;
  const [campaign, courses] = await Promise.all([
    referralCampaignService.get(id),
    prisma.learningPath.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  if (!campaign) notFound();

  return (
    <div className="space-y-7">
      <div>
        <Link href="/admin/referral-commissions" className="text-sm font-semibold text-teal-700 underline">
          ← Commission engine
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{campaign.name}</h1>
        <p className="mt-1 text-slate-500">
          {enumLabel(campaign.commissionType)} · {enumLabel(campaign.commissionBasis)} · Priority {campaign.priority}
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Campaign builder</CardTitle></CardHeader>
        <CardContent>
          <CampaignForm
            courses={courses}
            initial={{
              id: campaign.id,
              name: campaign.name,
              shortTitle: campaign.shortTitle,
              description: campaign.description,
              campaignCode: campaign.campaignCode,
              startsAt: toLocalInput(campaign.startsAt),
              endsAt: toLocalInput(campaign.endsAt),
              status: campaign.status,
              priority: campaign.priority,
              maxReferrals: campaign.maxReferrals,
              termsVersion: campaign.termsVersion,
              commissionType: campaign.commissionType,
              commissionBasis: campaign.commissionBasis,
              publishAsFeed: campaign.publishAsFeed,
              isActive: campaign.isActive,
              learningPathIds: campaign.courses.map((c) => c.learningPathId),
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Uploaded campaign media</CardTitle></CardHeader>
        <CardContent>
          <CampaignAssetGallery campaignId={campaign.id} assets={campaign.assets} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Campaign actions, assets, terms & FAQs</CardTitle></CardHeader>
        <CardContent>
          <CampaignManagePanel campaignId={campaign.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Milestone builder</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <MilestoneForm
            campaignId={campaign.id}
            nextSequence={(campaign.milestones.at(-1)?.sequence ?? 0) + 1}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Trigger</th>
                  <th className="px-4 py-3">Calc</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {campaign.milestones.map((milestone) => (
                  <tr key={milestone.id}>
                    <td className="px-4 py-3">{milestone.sequence}</td>
                    <td className="px-4 py-3 font-medium">{milestone.name}</td>
                    <td className="px-4 py-3">{enumLabel(milestone.trigger)}</td>
                    <td className="px-4 py-3">{enumLabel(milestone.calculationType)}</td>
                    <td className="px-4 py-3">
                      {milestone.calculationType === "PERCENTAGE"
                        ? `${Number(milestone.value)}%`
                        : `₹${Number(milestone.value).toLocaleString("en-IN")}`}
                    </td>
                    <td className="px-4 py-3">
                      <Badge>{milestone.isActive ? "Active" : "Inactive"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {campaign.milestones.length === 0 && (
              <p className="py-8 text-center text-slate-500">Add milestones to define installment / event rewards.</p>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Campaign window: {formatDate(campaign.startsAt)} → {formatDate(campaign.endsAt)}. Eligible courses:{" "}
            {campaign.courses.length === 0
              ? "All"
              : campaign.courses.map((c) => c.learningPath.title).join(", ")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
