import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { practiceLabService } from "@/services/practice-lab.service";
import { ResourceCreateForm } from "@/components/forms/resource-create-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function AdminPracticeLabExamsPage() {
  await requireRole(["ADMIN"]);

  const [feedItems, mappings] = await Promise.all([
    prisma.feedItem.findMany({ where: { type: "PRACTICE_LAB_EXAM" }, orderBy: { title: "asc" } }),
    practiceLabService.listAllMapped(),
  ]);
  const mappingByFeedItem = new Map(mappings.map((m) => [m.feedItemId, m]));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm font-semibold text-teal-700">← Administration</Link>
        <h1 className="mt-2 text-3xl font-bold">Practice Lab Exams</h1>
        <p className="mt-1 max-w-2xl text-slate-500">
          Map a Practice Lab Exam feed item to either one exam (a mock or sectional exam ID) or a whole
          program&apos;s practice access (drills, case lab, every exam in it), and set its price. On
          purchase, the student is automatically granted access and can launch straight into the
          Practice Lab — no separate sign-in needed.
        </p>
      </div>

      {feedItems.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            No Practice Lab Exam feed items yet — create one from{" "}
            <Link href="/admin/feed" className="font-semibold text-teal-700 hover:underline">
              Manage feed items
            </Link>{" "}
            with type &ldquo;Practice Lab Exam&rdquo;.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {feedItems.map((item) => {
          const mapping = mappingByFeedItem.get(item.id);
          return (
            <Card key={item.id}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">{item.title}</CardTitle>
                {mapping ? (
                  <Badge>Mapped</Badge>
                ) : (
                  <Badge className="border border-slate-200 bg-slate-50 text-slate-600">Not mapped</Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {mapping && (
                  <p className="text-sm text-slate-500">
                    {mapping.grantKind === "exam" ? `Exam ${mapping.examId}` : `Program ${mapping.programCode} (practice access)`}
                    {" · "}
                    {formatRupees(mapping.priceInPaise)}
                    {mapping.isActive ? "" : " · inactive"}
                  </p>
                )}
                <ResourceCreateForm
                  title={mapping ? "Edit mapping" : "Map to Practice Lab"}
                  endpoint={`/api/v1/practice-lab-exams/${item.id}`}
                  method="POST"
                  initialValues={{
                    grantKind: mapping?.grantKind ?? "exam",
                    examId: mapping?.examId ?? "",
                    programCode: mapping?.programCode ?? "",
                    priceInPaise: mapping ? String(mapping.priceInPaise) : "",
                    isActive: mapping?.isActive ?? true,
                  }}
                  fields={[
                    {
                      name: "grantKind",
                      label: "Grants",
                      type: "select",
                      required: true,
                      options: [
                        { value: "exam", label: "One exam" },
                        { value: "program_practice", label: "Whole program's practice access" },
                      ],
                    },
                    { name: "examId", label: "Practice Lab exam ID (copy from the Lab's /staff/exams page) — for \"One exam\"", type: "text" },
                    { name: "programCode", label: "Program code from the Lab's /staff/programs page (e.g. CPC) — for \"Whole program\"", type: "text" },
                    { name: "priceInPaise", label: "Price in paise (e.g. 150000 = ₹1,500)", type: "number", required: true },
                    { name: "isActive", label: "For sale", type: "checkbox", defaultValue: "true" },
                  ]}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
