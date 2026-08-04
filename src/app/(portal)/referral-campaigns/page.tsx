import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { isReferralProfileEligible } from "@/lib/referral-program";
import { enumLabel, formatDate } from "@/lib/utils";
import { campaignManagementService } from "@/services/campaign-management.service";
import { referralProfileService } from "@/services/referral-profile.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function ReferralCampaignsPage() {
  const user = await requireUser();
  const profile = await referralProfileService.getByUserId(user.id);
  if (!isReferralProfileEligible(profile)) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          <h1 className="text-2xl font-bold">Referral campaigns</h1>
          <p className="text-slate-500">Join the Referral Program first to browse and join campaigns.</p>
          <Link href="/referrals/join" className="font-semibold text-teal-700 underline">
            Join Referral Program →
          </Link>
        </CardContent>
      </Card>
    );
  }

  const [campaigns, joined] = await Promise.all([
    campaignManagementService.listPublic(),
    campaignManagementService.listJoined(user.id),
  ]);
  const joinedIds = new Set(joined.map((row) => row.campaignId));

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold text-teal-700">Campaigns</p>
        <h1 className="mt-1 text-3xl font-bold">Referral campaigns</h1>
        <p className="mt-2 text-slate-500">Active and upcoming commission campaigns you can join.</p>
      </div>

      {joined.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Joined campaigns</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {joined.map((row) => (
              <Link key={row.id} href={`/referral-campaigns/${row.campaign.campaignCode}`}>
                <Card className="transition hover:border-teal-300">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold">{row.campaign.name}</h3>
                        <p className="text-xs text-slate-500">{row.campaign.campaignCode}</p>
                      </div>
                      <Badge>Joined</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-500 line-clamp-2">{row.campaign.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Available campaigns</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((campaign) => {
            const banner =
              campaign.assets.find((a) => a.assetType === "BANNER")?.fileUrl ||
              campaign.assets.find((a) => a.assetType === "THUMBNAIL")?.fileUrl;
            return (
              <Link key={campaign.id} href={`/referral-campaigns/${campaign.campaignCode}`}>
                <Card className="overflow-hidden transition hover:border-teal-300">
                  {banner && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={banner} alt="" className="h-36 w-full object-cover" />
                  )}
                  <CardContent className="space-y-2 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold">{campaign.shortTitle || campaign.name}</h3>
                      <Badge>{enumLabel(campaign.status)}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2">{campaign.description}</p>
                    <p className="text-xs text-slate-400">
                      {formatDate(campaign.startsAt)} → {formatDate(campaign.endsAt)}
                      {joinedIds.has(campaign.id) ? " · Joined" : ""}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
        {campaigns.length === 0 && (
          <Card><CardContent className="p-10 text-center text-slate-500">No active campaigns right now.</CardContent></Card>
        )}
      </section>
    </div>
  );
}
