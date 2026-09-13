import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tutorLmsService } from "@/services/tutor-lms.service";
import { ResourceCreateForm } from "@/components/forms/resource-create-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function AdminTutorLmsCoursesPage() {
  await requireRole(["ADMIN"]);

  const [feedItems, mappings] = await Promise.all([
    prisma.feedItem.findMany({ where: { type: "TUTOR_LMS_COURSE" }, orderBy: { title: "asc" } }),
    tutorLmsService.listAllMapped(),
  ]);
  const mappingByFeedItem = new Map(mappings.map((m) => [m.feedItemId, m]));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm font-semibold text-teal-700">← Administration</Link>
        <h1 className="mt-2 text-3xl font-bold">Tutor LMS Courses</h1>
        <p className="mt-1 max-w-2xl text-slate-500">
          Map an LMS Course feed item to its actual course on the self-hosted WordPress + Tutor LMS
          instance, and set its price. On purchase, the student is automatically enrolled and can
          launch straight into the course — no separate WordPress login needed.
        </p>
      </div>

      {feedItems.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            No LMS Course feed items yet — create one from{" "}
            <Link href="/admin/feed" className="font-semibold text-teal-700 hover:underline">
              Manage feed items
            </Link>{" "}
            with type &ldquo;LMS Course&rdquo;.
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
                    Tutor course ID {mapping.tutorCourseId} · {formatRupees(mapping.priceInPaise)}
                    {mapping.isActive ? "" : " · inactive"}
                  </p>
                )}
                <ResourceCreateForm
                  title={mapping ? "Edit mapping" : "Map to Tutor LMS course"}
                  endpoint={`/api/v1/tutor-lms-courses/${item.id}`}
                  method="POST"
                  initialValues={{
                    tutorCourseId: mapping ? String(mapping.tutorCourseId) : "",
                    priceInPaise: mapping ? String(mapping.priceInPaise) : "",
                    isActive: mapping?.isActive ?? true,
                  }}
                  fields={[
                    { name: "tutorCourseId", label: "Tutor LMS course ID (the WordPress post ID)", type: "number", required: true },
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
