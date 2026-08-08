import Link from "next/link";
import { Award, UserCircle } from "lucide-react";

/** Shown whenever an action (quiz pass, marking an item complete) causes a new certificate to be issued. */
export function CertificateEarnedBanner({ advisingReady }: { advisingReady: boolean }) {
  return (
    <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6 dark:border-teal-900 dark:bg-teal-950/40">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-violet-600 text-white">
          <Award className="size-5" />
        </span>
        <div className="flex-1">
          <p className="font-bold text-teal-900 dark:text-teal-200">You just earned a certificate!</p>
          <p className="mt-1 text-sm text-teal-800/80 dark:text-teal-300/80">
            {advisingReady
              ? "A career officer will be in touch about your next steps."
              : "Complete your advising profile so we can recommend your next course."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/my-achievements"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800"
            >
              <Award className="size-4" /> View certificate
            </Link>
            {!advisingReady && (
              <Link
                href="/profile"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-teal-300 px-3 text-sm font-semibold text-teal-800 hover:bg-teal-100 dark:border-teal-800 dark:text-teal-200 dark:hover:bg-teal-950"
              >
                <UserCircle className="size-4" /> Complete your profile
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
