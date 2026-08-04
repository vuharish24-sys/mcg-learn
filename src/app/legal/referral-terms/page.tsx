import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { REFERRAL_TERMS_VERSION } from "@/lib/referral-program";

export default function ReferralTermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
        <Link href="/login" className="inline-flex items-center gap-2 font-bold text-teal-800 dark:text-teal-300">
          <span className="rounded-lg bg-teal-700 p-2 text-white"><HeartPulse className="size-4" /></span>
          Medical Coding Global
        </Link>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 p-5 md:p-10">
        <div>
          <p className="text-sm font-semibold text-teal-700">Version {REFERRAL_TERMS_VERSION}</p>
          <h1 className="mt-2 text-3xl font-bold">Referral Program Terms &amp; Conditions</h1>
        </div>
        <div className="space-y-4 text-sm leading-relaxed text-slate-600">
          <p>
            These Terms govern participation in the Medical Coding Global Referral Program on MCG Learn.
            By joining, you agree to introduce eligible prospective students in good faith and comply with
            applicable laws and Medical Coding Global policies.
          </p>
          <p>
            Referral rewards are discretionary based on program rules, eligibility of referred students,
            and verification by Medical Coding Global. Self-referrals, fraudulent activity, or misuse of
            referral codes may result in suspension of your Referral Profile and forfeiture of rewards.
          </p>
          <p>
            Your personal Referral Code is issued only after you accept these Terms and the Privacy Policy.
            The code is unique to you and must not be altered or transferred.
          </p>
          <p>
            Medical Coding Global may update these Terms. Material updates may require re-acceptance of a
            new terms version before continued participation.
          </p>
          <p>
            For questions about the Referral Program, contact Medical Coding Global support.
          </p>
        </div>
      </main>
    </div>
  );
}
