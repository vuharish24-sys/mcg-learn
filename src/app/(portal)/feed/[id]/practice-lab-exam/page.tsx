import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { practiceLabService } from "@/services/practice-lab.service";
import { BuyButton } from "@/components/purchases/buy-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function FeedPracticeLabExamPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const item = await prisma.feedItem.findFirst({ where: { id, type: "PRACTICE_LAB_EXAM" } });
  if (!item) notFound();
  if (item.status !== "PUBLISHED" && user.role.key !== "ADMIN") notFound();

  const [mapping, hasAccess] = await Promise.all([
    practiceLabService.getMapping(id),
    practiceLabService.hasAccess(user.id, id),
  ]);
  if (!mapping) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/feed" className="text-sm font-semibold text-teal-700">← Back</Link>
        {item.status !== "PUBLISHED" && (
          <Badge className="ml-2 border border-amber-200 bg-amber-50 text-amber-700">
            {item.status === "DRAFT" ? "Draft preview (admin only)" : item.status}
          </Badge>
        )}
        <h1 className="mt-3 text-3xl font-bold">{item.title}</h1>
        <Badge className="mt-2 border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300">
          Practice Lab — instant access
        </Badge>
        <p className="mt-2 text-slate-500">{item.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{hasAccess ? "You have access" : "Unlock this"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasAccess && (
            <p className="text-2xl font-bold text-teal-800">{formatRupees(mapping.priceInPaise)}</p>
          )}
          {hasAccess ? (
            <a
              href={`/api/v1/practice-lab-exams/${id}/launch`}
              className={buttonVariants({ variant: "gradient" })}
            >
              Launch Practice Lab <ExternalLink className="size-4" />
            </a>
          ) : (
            <BuyButton
              purchasableType="PRACTICE_LAB_EXAM"
              id={id}
              label={`Buy for ${formatRupees(mapping.priceInPaise)}`}
              learner={{ fullName: user.fullName, email: user.email, phone: user.phone }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
