import Link from "next/link";
import { HeartPulse } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
        <Link href="/login" className="inline-flex items-center gap-2 font-bold text-teal-800 dark:text-teal-300">
          <span className="rounded-lg bg-teal-700 p-2 text-white"><HeartPulse className="size-4" /></span>
          Medical Coding Global
        </Link>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 p-5 md:p-10">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <div className="space-y-4 text-sm leading-relaxed text-slate-600">
          <p>
            Medical Coding Global collects and processes personal information needed to operate MCG Learn,
            including account details, learning activity, referral participation, and lead/career inquiries.
          </p>
          <p>
            When you join the Referral Program, we store your acceptance of the Referral Program Terms,
            Privacy Policy acceptance timestamps, terms version, and your Referral Profile details for
            audit and eligibility purposes.
          </p>
          <p>
            We do not sell personal information. Data may be shared with service providers required to
            operate authentication, hosting, and communications, subject to appropriate safeguards.
          </p>
          <p>
            You may contact Medical Coding Global to request access or correction of your personal data
            where applicable under law.
          </p>
        </div>
      </main>
    </div>
  );
}
