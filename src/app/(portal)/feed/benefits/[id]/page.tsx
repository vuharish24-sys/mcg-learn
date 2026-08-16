import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Gift } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { benefitService, isBenefitActive } from "@/services/benefit.service";
import { formatDate, enumLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

function benefitValueLabel(benefit: {
  kind: string;
  discountAmount: number | null;
  discountPercent: number | null;
  code: string | null;
}) {
  if (benefit.kind === "DISCOUNT_FLAT") return `₹${(benefit.discountAmount ?? 0).toLocaleString("en-IN")} off`;
  if (benefit.kind === "DISCOUNT_PERCENT") return `${benefit.discountPercent ?? 0}% off`;
  if (benefit.kind === "PROMO_CODE") return benefit.code ? `Code: ${benefit.code}` : "Promo code";
  return benefit.discountAmount ? `Est. value ₹${benefit.discountAmount.toLocaleString("en-IN")}` : "Included perk";
}

export default async function BenefitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const benefit = await benefitService.get(id);
  if (!benefit) notFound();

  const courses = await benefitService.getCoursesForBenefit(id);
  const visibleCourses = courses.filter(
    ({ feedItem }) => feedItem.status === "PUBLISHED" || user.role.key === "ADMIN",
  );

  const active = isBenefitActive(benefit);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/feed" className="text-sm font-semibold text-teal-700">← Back to feed</Link>
        {benefit.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary CDN/upload URL
          <img
            src={benefit.imageUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="mt-3 aspect-video w-full rounded-2xl object-cover"
          />
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge className="gap-1 bg-amber-500 text-white shadow-sm">
            <Gift className="size-3" /> Scholarship
          </Badge>
          <Badge
            className={
              active
                ? "border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300"
                : "border border-slate-200 bg-transparent text-slate-500 dark:border-slate-700"
            }
          >
            {active ? "Active" : benefit.isActive ? "Outside window" : "Paused"}
          </Badge>
        </div>
        <h1 className="mt-3 text-3xl font-bold">{benefit.title}</h1>
        <p className="mt-2 text-lg font-semibold text-amber-700 dark:text-amber-400">
          {benefitValueLabel(benefit)}
        </p>
        {benefit.description && <p className="mt-2 text-slate-500">{benefit.description}</p>}
        <p className="mt-2 text-xs text-slate-400">
          {enumLabel(benefit.kind)} ·{" "}
          {benefit.startsAt ? formatDate(benefit.startsAt) : "No start limit"}
          {" → "}
          {benefit.expiresAt ? formatDate(benefit.expiresAt) : "No expiry"}
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Applies to {visibleCourses.length} course{visibleCourses.length === 1 ? "" : "s"}
        </h2>
        <div className="space-y-3">
          {visibleCourses.map(({ feedItem, variantLabels }) => (
            <Link key={feedItem.id} href={`/feed/${feedItem.id}/course`} prefetch={false} className="block">
              <Card className="transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{feedItem.title}</p>
                      {feedItem.status !== "PUBLISHED" && (
                        <Badge className="border border-amber-200 bg-amber-50 text-amber-700">
                          Draft preview (admin only)
                        </Badge>
                      )}
                    </div>
                    {variantLabels.length > 0 && (
                      <p className="mt-1 truncate text-sm text-slate-500">{variantLabels.join(", ")}</p>
                    )}
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-slate-400" />
                </CardContent>
              </Card>
            </Link>
          ))}
          {visibleCourses.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-slate-500">
                No courses currently have this benefit mapped.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
