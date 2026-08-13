import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Ticket, Gift } from "lucide-react";
import type { Benefit } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { parseFeedContent } from "@/lib/feed-actions";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getProfileCompleteness } from "@/services/profile.service";
import { benefitService, computeEffectivePrice } from "@/services/benefit.service";
import { FeedLeadForm } from "@/components/feed/feed-lead-form";
import { PathItemCompleteButton } from "@/components/learning-path/path-item-complete-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default async function FeedCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ learningPathId?: string }>;
}) {
  const user = await requireUser();
  const advisingReady = getProfileCompleteness(user).isReadyForAdvising;
  const { id } = await params;
  const { learningPathId } = await searchParams;
  const item = await prisma.feedItem.findFirst({ where: { id, type: "COURSE" } });
  if (!item) notFound();
  if (item.status !== "PUBLISHED" && user.role.key !== "ADMIN") notFound();

  const path = learningPathId
    ? await prisma.learningPath.findUnique({ where: { id: learningPathId } })
    : null;

  const { course } = parseFeedContent(item.content);

  const benefitsByVariant: Map<string, Benefit[]> = course
    ? await benefitService.getActiveForVariantIds(course.variants.map((v) => v.id))
    : new Map();

  await prisma.feedItem.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  const backHref = path ? `/learning-paths/${path.slug}` : "/feed";
  const showPathComplete = learningPathId && (!course || course.variants.every((v) => v.ctaType === "NONE"));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={backHref} className="text-sm font-semibold text-teal-700">← Back</Link>
        {item.status !== "PUBLISHED" && (
          <Badge className="ml-2 border border-amber-200 bg-amber-50 text-amber-700">
            {item.status === "DRAFT" ? "Draft preview (admin only)" : item.status}
          </Badge>
        )}
        <h1 className="mt-3 text-3xl font-bold">{item.title}</h1>
        <p className="mt-2 text-slate-500">{item.description}</p>
        {course?.instructor && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Instructor: {course.instructor}</p>}
        {path && <p className="mt-2 text-sm text-teal-700">Part of: {path.title}</p>}
      </div>

      {course?.variants.map((variant) => {
        const label = variant.tier ? `${variant.tier} — ${variant.mode}` : variant.mode;
        const benefits = benefitsByVariant.get(variant.id) ?? [];
        const { effectiveFee, appliedBenefit } = computeEffectivePrice(variant.fee, benefits);
        const perksAndCodes = benefits.filter((b) => b.kind === "PERK" || b.kind === "PROMO_CODE");
        return (
          <Card key={variant.id}>
            <CardHeader>
              <CardTitle>{label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                {variant.fee && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Fee</p>
                    {effectiveFee ? (
                      <p className="mt-1">
                        <span className="text-slate-400 line-through">{variant.fee}</span>{" "}
                        <span className="font-semibold text-teal-700 dark:text-teal-400">{effectiveFee}</span>
                      </p>
                    ) : (
                      <p className="mt-1 text-slate-700 dark:text-slate-300">{variant.fee}</p>
                    )}
                    {appliedBenefit && (
                      <p className="mt-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                        Offer: {appliedBenefit.title}
                        {appliedBenefit.code ? ` (Code: ${appliedBenefit.code})` : ""}
                      </p>
                    )}
                  </div>
                )}
                {variant.duration && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Duration</p>
                    <p className="mt-1 text-slate-700 dark:text-slate-300">{variant.duration}</p>
                  </div>
                )}
                {variant.startDate && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Starts</p>
                    <p className="mt-1 text-slate-700 dark:text-slate-300">{formatDate(variant.startDate)}</p>
                  </div>
                )}
              </div>

              {perksAndCodes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {perksAndCodes.map((benefit) => (
                    <Badge
                      key={benefit.id}
                      className="border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300"
                    >
                      {benefit.kind === "PROMO_CODE" ? (
                        <Ticket className="mr-1 inline size-3" />
                      ) : (
                        <Gift className="mr-1 inline size-3" />
                      )}
                      {benefit.title}
                      {benefit.code ? ` (${benefit.code})` : ""}
                      {benefit.kind === "PERK" && benefit.discountAmount
                        ? ` — Est. value ₹${benefit.discountAmount.toLocaleString("en-IN")}`
                        : ""}
                    </Badge>
                  ))}
                </div>
              )}

              {variant.ctaType === "LINK" && variant.ctaUrl && (
                <a
                  href={variant.ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "gradient" })}
                >
                  {variant.ctaLabel || "Enroll Now"} <ExternalLink className="size-4" />
                </a>
              )}

              {variant.ctaType === "FORM" && (
                <FeedLeadForm
                  endpoint={`/api/v1/feed/${id}/register`}
                  submitLabel={variant.ctaLabel || "Submit"}
                  defaultName={user.fullName}
                  defaultEmail={user.email}
                  defaultPhone={user.phone ?? undefined}
                  variantMode={label}
                />
              )}
            </CardContent>
          </Card>
        );
      })}

      {showPathComplete && (
        <Card>
          <CardContent className="p-6">
            <PathItemCompleteButton
              learningPathId={learningPathId!}
              feedItemId={item.id}
              label="Mark as Completed"
              advisingReady={advisingReady}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
