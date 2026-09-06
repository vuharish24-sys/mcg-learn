import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { courseEnrollmentService } from "@/services/course-enrollment.service";
import { formatDate } from "@/lib/utils";
import { EnrollStudentForm } from "@/components/trainer-program/enroll-student-form";
import { UnenrollButton } from "@/components/trainer-program/unenroll-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminCourseEnrollmentsPage() {
  await requireRole(["ADMIN"]);
  const courses = await prisma.feedItem.findMany({ where: { type: "COURSE" }, orderBy: { title: "asc" } });
  const enrollmentsByCourse = await Promise.all(courses.map((c) => courseEnrollmentService.listForCourse(c.id)));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm font-semibold text-teal-700">← Administration</Link>
        <h1 className="mt-2 text-3xl font-bold">Course Enrollments</h1>
        <p className="mt-1 max-w-2xl text-slate-500">
          Course fees are paid off-platform — enroll a student here once payment is confirmed to unlock that course&apos;s modules for them.
        </p>
      </div>

      <div className="grid gap-4">
        {courses.map((course, index) => {
          const enrollments = enrollmentsByCourse[index];
          return (
            <Card key={course.id}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">{course.title}</CardTitle>
                <EnrollStudentForm feedItemId={course.id} />
              </CardHeader>
              <CardContent className="space-y-2">
                {enrollments.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5 text-sm dark:border-slate-800">
                    <div>
                      <p className="font-medium">{e.user.fullName}</p>
                      <p className="text-xs text-slate-500">{e.user.email} · Enrolled {formatDate(e.enrolledAt)}</p>
                    </div>
                    <UnenrollButton enrollmentId={e.id} />
                  </div>
                ))}
                {enrollments.length === 0 && <p className="text-sm text-slate-500">No students enrolled yet.</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
