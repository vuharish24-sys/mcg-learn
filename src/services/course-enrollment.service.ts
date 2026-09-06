import { AppValidationError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const courseEnrollmentService = {
  async isEnrolled(userId: string, feedItemId: string): Promise<boolean> {
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { userId_feedItemId: { userId, feedItemId } },
    });
    return Boolean(enrollment);
  },

  listForCourse(feedItemId: string) {
    return prisma.courseEnrollment.findMany({
      where: { feedItemId },
      include: { user: { select: { fullName: true, email: true } } },
      orderBy: { enrolledAt: "desc" },
    });
  },

  async enroll(userEmail: string, feedItemId: string) {
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) throw new AppValidationError(`No account found for ${userEmail}`);

    const course = await prisma.feedItem.findUnique({ where: { id: feedItemId } });
    if (!course || course.type !== "COURSE") throw new AppValidationError("Course not found");

    return prisma.courseEnrollment.upsert({
      where: { userId_feedItemId: { userId: user.id, feedItemId } },
      update: {},
      create: { userId: user.id, feedItemId },
      include: { user: { select: { fullName: true, email: true } } },
    });
  },

  async unenroll(id: string) {
    const existing = await prisma.courseEnrollment.findUnique({ where: { id } });
    if (!existing) throw new AppValidationError("Enrollment not found");
    await prisma.courseEnrollment.delete({ where: { id } });
  },
};
