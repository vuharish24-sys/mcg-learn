import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { appUrl } from "@/lib/env";
import { isReferralProfileEligible } from "@/lib/referral-program";
import { formatDate, enumLabel } from "@/lib/utils";
import { referralProfileService } from "@/services/referral-profile.service";
import { referralService } from "@/services/referral.service";
import { referralCommissionService } from "@/services/referral-commission.service";
import { campaignManagementService } from "@/services/campaign-management.service";
import { JoinReferralProgramPanel } from "@/components/referrals/join-referral-program-panel";
import { ReferralMilestonePipeline } from "@/components/referrals/referral-milestone-pipeline";
import { ResourceCreateForm } from "@/components/forms/resource-create-form";
import { StatusSelect } from "@/components/forms/status-select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statuses = ["PENDING", "QUALIFIED", "REWARDED", "REJECTED"];

export default async function ReferralsPage() {
  const user = await requireUser();
  const canManageStatus = ["ADMIN", "CAREER_OFFICER"].includes(user.role.key);
  const isAdmin = user.role.key === "ADMIN";
  const profile = await referralProfileService.getByUserId(user.id);
  const eligible = isReferralProfileEligible(profile);

  // Non-admin participants must join before using the referral dashboard.
  if (!isAdmin && !eligible) {
    return <JoinReferralProgramPanel />;
  }

  // Admin without a profile can oversee referrals, but must join to create personal invites.
  const [referrals, commissionSummary, commissionHistory, campaigns, joined, pipelines] = await Promise.all([
    referralService.list(isAdmin ? undefined : user.id),
    referralCommissionService.summary(isAdmin ? undefined : user.id),
    referralCommissionService.listTransactions({
      referrerId: isAdmin ? undefined : user.id,
    }),
    campaignManagementService.listPublic(),
    eligible ? campaignManagementService.listJoined(user.id) : Promise.resolve([]),
    campaignManagementService.listReferralPipelines(user.id),
  ]);
  const joinedIds = new Set(joined.map((row) => row.campaignId));
  const total = referrals.length;
  const pendingRewards = referrals.filter((item) => item.status === "QUALIFIED").length;
  const paidRewards = referrals.filter((item) => item.status === "REWARDED").length;
  const partnerLink = profile
    ? `${appUrl()}/register?ref=${profile.referralCode}`
    : null;

  return (
    <div className="space-y-6">
      {!eligible && isAdmin && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="font-semibold text-amber-800">
              Join the Referral Program to create personal referral invites and receive a partner code.
            </p>
            <a href="/referrals/join" className="text-sm font-semibold text-teal-700 underline">
              Join Referral Program →
            </a>
          </CardContent>
        </Card>
      )}

      {eligible && profile && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">My Referrals</h1>
              <p className="mt-1 text-slate-500">Your Referral Partner dashboard.</p>
            </div>
            <ResourceCreateForm
              title="Submit referral lead"
              endpoint="/api/v1/referrals"
              fields={[
                {
                  name: "referredName",
                  label: "Referred person’s name",
                  required: true,
                },
                {
                  name: "referredEmail",
                  label: "Referred person’s email",
                  type: "email",
                  required: true,
                },
                {
                  name: "referredPhone",
                  label: "Referred person’s phone",
                  type: "text",
                  required: true,
                  placeholder: "+91 98765 43210",
                },
              ]}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Referral Code</p>
                <p className="mt-2 font-mono text-xl font-bold text-teal-700">{profile.referralCode}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Referral Link</p>
                <a className="mt-2 block break-all text-sm font-semibold text-teal-700 underline" href={partnerLink!}>
                  {partnerLink}
                </a>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Joined</p>
                <p className="mt-2 text-lg font-bold">{formatDate(profile.joinedAt)}</p>
                <p className="text-xs text-slate-400">Terms {profile.termsVersion}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Campaigns</p>
                <p className="mt-2 text-lg font-bold">
                  {profile.campaignEligible ? "Eligible" : "Not eligible"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Total Referrals</p>
                <p className="mt-2 text-3xl font-bold">{total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Pending Rewards</p>
                <p className="mt-2 text-3xl font-bold">{pendingRewards}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Paid Rewards</p>
                <p className="mt-2 text-3xl font-bold">{paidRewards}</p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {isAdmin && !eligible && (
        <div>
          <h1 className="text-3xl font-bold">Referrals</h1>
          <p className="mt-1 text-slate-500">Platform referral oversight.</p>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>Current campaigns</CardTitle>
          <Link href="/referral-campaigns" className="text-sm font-semibold text-teal-700 underline">
            View all campaigns →
          </Link>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="text-sm text-slate-500">No active campaigns right now.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {campaigns.map((campaign) => {
                const banner =
                  campaign.assets.find((a) => a.assetType === "BANNER")?.fileUrl ||
                  campaign.assets.find((a) => a.assetType === "THUMBNAIL")?.fileUrl;
                const isJoined = joinedIds.has(campaign.id);
                return (
                  <Link
                    key={campaign.id}
                    href={`/referral-campaigns/${campaign.campaignCode}`}
                    className="block overflow-hidden rounded-xl border transition hover:border-teal-300 dark:border-slate-800"
                  >
                    {banner && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={banner} alt="" className="h-28 w-full object-cover" />
                    )}
                    <div className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-bold">{campaign.shortTitle || campaign.name}</h3>
                        <div className="flex flex-wrap justify-end gap-1">
                          <Badge>{enumLabel(campaign.status)}</Badge>
                          {isJoined && <Badge>Joined</Badge>}
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2">{campaign.description}</p>
                      <p className="text-xs text-slate-400">
                        {formatDate(campaign.startsAt)} → {formatDate(campaign.endsAt)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ReferralMilestonePipeline referrals={pipelines} />

      <Card>
        <CardHeader>
          <CardTitle>Lead History</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900">
              <tr>
                <th className="px-5 py-4">Code</th>
                <th className="px-5 py-4">Referred user</th>
                <th className="px-5 py-4">Referrer</th>
                <th className="px-5 py-4">Created</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {referrals.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-4">
                    <p className="font-mono font-bold text-teal-700">{item.code}</p>
                    <a
                      className="text-xs text-slate-500 underline"
                      href={`${appUrl()}/register?ref=${item.code}`}
                    >
                      Invite link
                    </a>
                  </td>
                  <td className="px-5 py-4">
                    {item.referredUser?.fullName ?? item.referredName ?? "Pending registration"}
                    <p className="text-xs text-slate-500">
                      {item.referredUser?.email ?? item.referredEmail}
                    </p>
                    {item.referredPhone && (
                      <p className="text-xs text-slate-500">{item.referredPhone}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">{item.referrer.fullName}</td>
                  <td className="px-5 py-4">{formatDate(item.createdAt)}</td>
                  <td className="px-5 py-4">
                    {canManageStatus ? (
                      <StatusSelect
                        endpoint={`/api/v1/referrals/${item.id}`}
                        value={item.status}
                        options={statuses}
                      />
                    ) : (
                      <Badge>{enumLabel(item.status)}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {referrals.length === 0 && (
            <p className="p-12 text-center text-slate-500">No referrals created yet.</p>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Commission earned</p>
            <p className="mt-2 text-2xl font-bold">
              ₹{commissionSummary.totalEarned.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Pending</p>
            <p className="mt-2 text-2xl font-bold">
              ₹{commissionSummary.pending.amount.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Approved</p>
            <p className="mt-2 text-2xl font-bold">
              ₹{commissionSummary.approved.amount.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Paid</p>
            <p className="mt-2 text-2xl font-bold">
              ₹{commissionSummary.paid.amount.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Commission history</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900">
              <tr>
                <th className="px-5 py-4">Student</th>
                <th className="px-5 py-4">Campaign</th>
                <th className="px-5 py-4">Milestone</th>
                <th className="px-5 py-4">Calculation</th>
                <th className="px-5 py-4">Basis</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Payment date</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {commissionHistory.map((txn) => (
                <tr key={txn.id}>
                  <td className="px-5 py-4">
                    {txn.referral.referredName ?? txn.referral.referredEmail ?? "—"}
                  </td>
                  <td className="px-5 py-4">{txn.campaign.name}</td>
                  <td className="px-5 py-4">{txn.milestone.name}</td>
                  <td className="px-5 py-4">
                    {enumLabel(txn.calculationType)}{" "}
                    {txn.calculationType === "PERCENTAGE"
                      ? `${Number(txn.value)}%`
                      : `₹${Number(txn.value).toLocaleString("en-IN")}`}
                  </td>
                  <td className="px-5 py-4">{enumLabel(txn.commissionBasis)}</td>
                  <td className="px-5 py-4 font-semibold">
                    ₹{Number(txn.calculatedAmount).toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-4"><Badge>{enumLabel(txn.status)}</Badge></td>
                  <td className="px-5 py-4">
                    {txn.payment ? formatDate(txn.payment.paymentDate) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {commissionHistory.length === 0 && (
            <p className="p-12 text-center text-slate-500">
              Commission appears after admin calculates milestone rewards for your referrals.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
