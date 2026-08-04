import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isReferralProfileEligible } from "@/lib/referral-program";
import { referralProfileService } from "@/services/referral-profile.service";
import { JoinReferralProgramPanel } from "@/components/referrals/join-referral-program-panel";

export default async function JoinReferralProgramPage() {
  const user = await requireUser();
  const profile = await referralProfileService.getByUserId(user.id);
  if (isReferralProfileEligible(profile)) {
    redirect("/referrals");
  }

  return <JoinReferralProgramPanel />;
}
