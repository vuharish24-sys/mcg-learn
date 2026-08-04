import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isReferralProfileEligible } from "@/lib/referral-program";
import { enumLabel, formatDate } from "@/lib/utils";
import { campaignManagementService } from "@/services/campaign-management.service";
import { referralProfileService } from "@/services/referral-profile.service";
import { JoinCampaignForm } from "@/components/referral-commission/join-campaign-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ReferralCampaignDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const user = await requireUser();
  const { code } = await params;
  const campaign = await campaignManagementService.getByCodeOrId(code);
  if (!campaign) notFound();

  const profile = await referralProfileService.getByUserId(user.id);
  const eligible = isReferralProfileEligible(profile);
  const participant = await campaignManagementService.listJoined(user.id).then((rows) =>
    rows.find((row) => row.campaignId === campaign.id),
  );
  const share = campaignManagementService.shareLinks(campaign, profile?.referralCode);
  const banner = campaign.assets.find((a) => a.assetType === "BANNER")?.fileUrl;
  const terms = campaign.terms[0];
  const leaderboard = await campaignManagementService.leaderboard(campaign.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/referral-campaigns" className="text-sm font-semibold text-teal-700 underline">
        ← Campaigns
      </Link>

      {banner && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={banner} alt="" className="h-56 w-full rounded-xl object-cover" />
      )}

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{enumLabel(campaign.status)}</Badge>
          <Badge>{campaign.campaignCode}</Badge>
        </div>
        <h1 className="mt-2 text-3xl font-bold">{campaign.name}</h1>
        {campaign.shortTitle && <p className="text-lg text-slate-500">{campaign.shortTitle}</p>}
        <p className="mt-3 text-slate-600">{campaign.description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Campaign</p><p className="mt-1 text-sm font-semibold">{formatDate(campaign.startsAt)} → {formatDate(campaign.endsAt)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Registration</p><p className="mt-1 text-sm font-semibold">{formatDate(campaign.registrationStartsAt ?? campaign.startsAt)} → {formatDate(campaign.registrationEndsAt ?? campaign.endsAt)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Referrals</p><p className="mt-1 text-sm font-semibold">{formatDate(campaign.referralStartsAt ?? campaign.startsAt)} → {formatDate(campaign.referralEndsAt ?? campaign.endsAt)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Eligible courses</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {campaign.courses.length === 0 && <p className="text-sm text-slate-500">All courses</p>}
          {campaign.courses.map((course) => (
            <p key={course.id} className="text-sm font-medium">{course.learningPath.title}</p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Reward structure / milestones</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-500">
            {enumLabel(campaign.commissionType)} · basis {enumLabel(campaign.commissionBasis)}
          </p>
          {campaign.milestones.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm last:border-0">
              <div>
                <p className="font-semibold">{m.sequence}. {m.name}</p>
                <p className="text-xs text-slate-500">{enumLabel(m.trigger)}</p>
              </div>
              <p className="font-semibold">
                {m.calculationType === "PERCENTAGE" ? `${Number(m.value)}%` : `₹${Number(m.value).toLocaleString("en-IN")}`}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {terms && (
        <Card>
          <CardHeader><CardTitle>Campaign terms ({terms.version})</CardTitle></CardHeader>
          <CardContent><p className="whitespace-pre-wrap text-sm text-slate-600">{terms.content}</p></CardContent>
        </Card>
      )}

      {campaign.faqs.length > 0 && (
        <Card>
          <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {campaign.faqs.map((faq) => (
              <div key={faq.id}>
                <p className="font-semibold">{faq.question}</p>
                <p className="mt-1 text-sm text-slate-600">{faq.answer}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {leaderboard.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Top referrers</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.map((row, index) => (
              <div key={row.referrerId} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                <span className="font-medium">{index + 1}. {row.displayName}</span>
                <span className="text-slate-500">{row.successfulReferrals} referral{row.successfulReferrals === 1 ? "" : "s"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Share campaign</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-slate-500">Campaign URL:</span> <a className="text-teal-700 underline break-all" href={share.campaignUrl}>{share.campaignUrl}</a></p>
          <p><span className="text-slate-500">Referral URL:</span> <a className="text-teal-700 underline break-all" href={share.referralUrl}>{share.referralUrl}</a></p>
          <p className="text-xs text-slate-400">QR payload ready: {share.qrPayload}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Join this campaign</CardTitle></CardHeader>
        <CardContent>
          {!eligible ? (
            <p className="text-sm text-slate-500">
              <Link href="/referrals/join" className="font-semibold text-teal-700 underline">Join the Referral Program</Link> first.
            </p>
          ) : participant ? (
            <p className="text-sm font-semibold text-teal-700">You joined on {formatDate(participant.joinedAt)} (terms {participant.termsVersion}).</p>
          ) : (
            <JoinCampaignForm campaignCode={campaign.campaignCode} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
