import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moodleCourseService } from "@/services/moodle-course.service";
import { ResourceCreateForm } from "@/components/forms/resource-create-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function AdminMoodleCoursesPage() {
  await requireRole(["ADMIN"]);

  const [feedItems, mappings] = await Promise.all([
    prisma.feedItem.findMany({ where: { type: "MOODLE_COURSE" }, orderBy: { title: "asc" } }),
    moodleCourseService.listAllMapped(),
  ]);
  const mappingByFeedItem = new Map(mappings.map((m) => [m.feedItemId, m]));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm font-semibold text-teal-700">← Administration</Link>
        <h1 className="mt-2 text-3xl font-bold">Moodle Courses</h1>
        <p className="mt-1 max-w-2xl text-slate-500">
          Map an LMS Course feed item to its actual course on the self-hosted Moodle instance, set
          its price, and paste in the exact launch URL and custom properties from Moodle&rsquo;s
          &ldquo;Publish as LTI tool&rdquo; screen once that course is registered there. The launch
          URL must be the bare Tool URL with no query string — Moodle rejects one that has a query
          string appended (confirmed on a real launch attempt); the resource-specific &ldquo;id&rdquo;
          goes in Custom properties instead.
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
                  <Badge className={mapping.targetLinkUri ? "" : "border border-amber-200 bg-amber-50 text-amber-700"}>
                    {mapping.targetLinkUri ? "Ready to launch" : "Missing launch URL"}
                  </Badge>
                ) : (
                  <Badge className="border border-slate-200 bg-slate-50 text-slate-600">Not mapped</Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {mapping && (
                  <p className="text-sm text-slate-500">
                    Moodle course ID {mapping.moodleCourseId} · {formatRupees(mapping.priceInPaise)}
                    {mapping.isActive ? "" : " · inactive"}
                  </p>
                )}
                <ResourceCreateForm
                  title={mapping ? "Edit mapping" : "Map to Moodle course"}
                  endpoint={`/api/v1/moodle-courses/${item.id}`}
                  method="POST"
                  initialValues={{
                    moodleCourseId: mapping ? String(mapping.moodleCourseId) : "",
                    moodleCourseIdNumber: mapping?.moodleCourseIdNumber ?? "",
                    targetLinkUri: mapping?.targetLinkUri ?? "",
                    ltiCustomParams: mapping?.ltiCustomParams ?? "",
                    priceInPaise: mapping ? String(mapping.priceInPaise) : "",
                    isActive: mapping?.isActive ?? true,
                  }}
                  fields={[
                    { name: "moodleCourseId", label: "Moodle course ID", type: "number", required: true },
                    { name: "moodleCourseIdNumber", label: "Moodle idnumber/shortname (optional, for reference)" },
                    {
                      name: "targetLinkUri",
                      label: "Launch URL — Tool URL only, no query string (from Moodle's Publish as LTI tool screen)",
                      type: "url",
                    },
                    {
                      name: "ltiCustomParams",
                      label: "Custom properties (e.g. id=76205b0e-...) — from the same Moodle screen",
                    },
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
