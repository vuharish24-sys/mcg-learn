import { PortalNav } from "@/components/layout/portal-nav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { requireUser } from "@/lib/auth";
import { isReferralProfileEligible } from "@/lib/referral-program";
import { referralProfileService } from "@/services/referral-profile.service";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const profile = await referralProfileService.getByUserId(user.id);
  const referralProgramJoined = isReferralProfileEligible(profile);

  return (
    <div className="min-h-screen">
      <PortalNav
        role={user.role.key}
        userName={user.fullName}
        referralProgramJoined={referralProgramJoined}
      />
      <main className="pb-24 md:ml-64 md:pb-0">
        <header className="flex h-16 items-center justify-between border-b bg-white px-5 md:px-8 dark:border-slate-800 dark:bg-slate-950">
          <p className="font-semibold md:hidden">MCG Learn</p>
          <div className="ml-auto flex items-center gap-3">
            <p className="hidden text-sm text-slate-500 sm:block">Medical Coding Global</p>
            <ThemeToggle />
          </div>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
