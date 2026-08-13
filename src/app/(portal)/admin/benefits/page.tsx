import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { benefitService, isBenefitActive } from "@/services/benefit.service";
import { formatDate, enumLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BenefitForm } from "@/components/forms/benefit-form";

function benefitValueLabel(benefit: {
  kind: string;
  discountAmount: number | null;
  discountPercent: number | null;
  code: string | null;
}) {
  if (benefit.kind === "DISCOUNT_FLAT") return `₹${benefit.discountAmount ?? 0} off`;
  if (benefit.kind === "DISCOUNT_PERCENT") return `${benefit.discountPercent ?? 0}% off`;
  if (benefit.kind === "PROMO_CODE") return benefit.code ? `Code: ${benefit.code}` : "Promo code";
  return benefit.discountAmount ? `Est. value ₹${benefit.discountAmount}` : "No monetary value";
}

export default async function AdminBenefitsPage() {
  await requireRole(["ADMIN"]);
  const benefits = await benefitService.list();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-teal-700">← Administration</Link>
          <h1 className="mt-2 text-3xl font-bold">Course Benefits</h1>
          <p className="mt-1 max-w-2xl text-slate-500">
            Coupons, scholarships, and other perks — created once here, then mapped onto specific
            course tiers/modes from the course&rsquo;s edit form. Each auto-expires on its own
            schedule without needing to touch the course itself.
          </p>
        </div>
        <BenefitForm />
      </div>

      <div className="grid gap-4">
        {benefits.map((benefit) => {
          const active = isBenefitActive(benefit);
          return (
            <Card key={benefit.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {benefit.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={benefit.imageUrl}
                        alt=""
                        className="size-14 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <p className="font-bold">{benefit.title}</p>
                      <p className="text-xs text-slate-500">
                        {enumLabel(benefit.kind)} · {benefitValueLabel(benefit)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
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
                </div>
                {benefit.description && <p className="text-sm text-slate-500">{benefit.description}</p>}
                <p className="text-xs text-slate-400">
                  {benefit.startsAt ? formatDate(benefit.startsAt) : "No start limit"}
                  {" → "}
                  {benefit.expiresAt ? formatDate(benefit.expiresAt) : "No expiry"}
                </p>
                <BenefitForm
                  benefitId={benefit.id}
                  initial={{
                    title: benefit.title,
                    kind: benefit.kind,
                    code: benefit.code,
                    discountAmount: benefit.discountAmount,
                    discountPercent: benefit.discountPercent,
                    description: benefit.description,
                    imageUrl: benefit.imageUrl,
                    startsAt: benefit.startsAt?.toISOString() ?? null,
                    expiresAt: benefit.expiresAt?.toISOString() ?? null,
                    isActive: benefit.isActive,
                  }}
                />
              </CardContent>
            </Card>
          );
        })}
        {benefits.length === 0 && (
          <Card><CardContent className="p-12 text-center text-slate-500">No benefits yet.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
