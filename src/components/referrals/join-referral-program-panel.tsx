import Link from "next/link";
import { REFERRAL_TERMS_VERSION } from "@/lib/referral-program";
import { JoinReferralProgramForm } from "@/components/referrals/join-referral-program-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function JoinReferralProgramPanel() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-teal-700">Referral Program</p>
        <h1 className="mt-1 text-3xl font-bold">Medical Coding Global Referral Program</h1>
        <p className="mt-3 text-slate-500">
          Become a Referral Partner. Earn referral rewards by introducing eligible students to Medical Coding Global.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Before joining you must</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>
              Read and accept the{" "}
              <Link href="/legal/referral-terms" className="font-semibold text-teal-700 underline">
                Referral Program Terms &amp; Conditions
              </Link>
              .
            </li>
            <li>
              Read and accept the{" "}
              <Link href="/legal/privacy" className="font-semibold text-teal-700 underline">
                Privacy Policy
              </Link>
              .
            </li>
          </ul>
          <p className="text-xs text-slate-400">Current terms version: {REFERRAL_TERMS_VERSION}</p>
          <JoinReferralProgramForm />
        </CardContent>
      </Card>
    </div>
  );
}
