import Link from "next/link";
import { Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { BenefitKind } from "@prisma/client";

export type BenefitFeedCardData = {
  id: string;
  title: string;
  kind: BenefitKind;
  code: string | null;
  discountAmount: number | null;
  discountPercent: number | null;
  description: string | null;
  imageUrl: string | null;
  courseCount: number;
};

function benefitHeadline(benefit: BenefitFeedCardData) {
  if (benefit.kind === "DISCOUNT_FLAT") return `₹${(benefit.discountAmount ?? 0).toLocaleString("en-IN")} off`;
  if (benefit.kind === "DISCOUNT_PERCENT") return `${benefit.discountPercent ?? 0}% off`;
  if (benefit.kind === "PROMO_CODE") return "Promo code";
  return benefit.discountAmount ? `Est. value ₹${benefit.discountAmount.toLocaleString("en-IN")}` : "Included perk";
}

export function BenefitCard({ benefit }: { benefit: BenefitFeedCardData }) {
  return (
    <Link href={`/feed/benefits/${benefit.id}`} className="group block h-full w-full">
      <Card className="relative flex aspect-square h-full w-full flex-col justify-between overflow-hidden border-0 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-4 text-white shadow-md ring-1 ring-slate-200/80 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:p-5 dark:ring-slate-800">
        {benefit.imageUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- cover photo, arbitrary CDN/upload URL */}
            <img
              src={benefit.imageUrl}
              alt=""
              referrerPolicy="no-referrer"
              decoding="async"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />
          </>
        )}

        <div className="relative flex items-start justify-between gap-2">
          <Badge className="gap-1 bg-white/20 text-white shadow-none backdrop-blur-sm">
            <Gift className="size-3" /> Benefit
          </Badge>
          {benefit.code && (
            <span className="rounded-md border border-dashed border-white/60 px-2 py-1 text-[10px] font-bold tracking-wide">
              {benefit.code}
            </span>
          )}
        </div>

        <div className="relative">
          <p className="text-2xl font-black leading-none sm:text-3xl lg:text-4xl">{benefitHeadline(benefit)}</p>
          <h2 className="mt-2 line-clamp-2 text-sm font-bold leading-snug sm:text-base">{benefit.title}</h2>
          {benefit.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/85 sm:text-sm">{benefit.description}</p>
          )}
        </div>

        <div className="relative flex items-center justify-between text-xs text-white/90 sm:text-sm">
          <span>
            {benefit.courseCount} course{benefit.courseCount === 1 ? "" : "s"}
          </span>
          <span className="font-semibold">View details →</span>
        </div>
      </Card>
    </Link>
  );
}
