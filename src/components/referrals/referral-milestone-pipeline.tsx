import { Lock } from "lucide-react";
import { enumLabel, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PipelineMilestone = {
  id: string;
  name: string;
  sequence: number;
  status: string;
  unlockedAt: Date | null;
  dueDate: Date | null;
  expiryDate: Date | null;
};

type PipelineReferral = {
  id: string;
  code: string;
  referredName: string | null;
  referredEmail: string | null;
  referredUser: { fullName: string } | null;
  referralMilestones: (PipelineMilestone & {
    campaign: { id: string; name: string; campaignCode: string };
  })[];
};

function isExpiringSoon(date: Date | null) {
  if (!date) return false;
  const days = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 3;
}

export function ReferralMilestonePipeline({ referrals }: { referrals: PipelineReferral[] }) {
  if (referrals.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Referral progress</CardTitle>
        <p className="text-sm text-slate-500">
          Reward milestones unlock one at a time — the next step appears with its expiry date once the
          current one is approved.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {referrals.map((referral) => {
          const byCampaign = new Map<
            string,
            { campaign: PipelineReferral["referralMilestones"][number]["campaign"]; milestones: PipelineMilestone[] }
          >();
          for (const m of referral.referralMilestones) {
            const entry = byCampaign.get(m.campaign.id) ?? { campaign: m.campaign, milestones: [] };
            entry.milestones.push(m);
            byCampaign.set(m.campaign.id, entry);
          }

          return (
            <div key={referral.id} className="space-y-4 border-b pb-6 last:border-0 last:pb-0 dark:border-slate-800">
              <div>
                <p className="font-semibold">
                  {referral.referredUser?.fullName ?? referral.referredName ?? referral.referredEmail ?? referral.code}
                </p>
                <p className="text-xs text-slate-500 font-mono">{referral.code}</p>
              </div>
              {[...byCampaign.values()].map(({ campaign, milestones }) => (
                <div key={campaign.id} className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-slate-500">{campaign.name}</p>
                  <div className="flex flex-wrap gap-3">
                    {milestones.map((m) => {
                      const locked = !m.unlockedAt;
                      return (
                        <div
                          key={m.id}
                          className={`min-w-[200px] flex-1 rounded-lg border p-3 text-sm ${
                            locked
                              ? "border-dashed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                              : "border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold">
                              {m.sequence}. {m.name}
                            </p>
                            {locked ? (
                              <Badge className="flex items-center gap-1 text-slate-500">
                                <Lock className="size-3" /> Locked
                              </Badge>
                            ) : (
                              <Badge>{enumLabel(m.status)}</Badge>
                            )}
                          </div>
                          {locked ? (
                            <p className="mt-1 text-xs text-slate-400">
                              Unlocks once the previous milestone is approved.
                            </p>
                          ) : (
                            <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                              {m.dueDate && <p>Due by {formatDate(m.dueDate)}</p>}
                              {m.expiryDate && (
                                <p className={isExpiringSoon(m.expiryDate) ? "font-semibold text-amber-600" : undefined}>
                                  Expires {formatDate(m.expiryDate)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
