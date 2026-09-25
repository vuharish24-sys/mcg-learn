import { AppValidationError } from "@/lib/api";
import { appUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { findOrCreateWpUser, enrollWpUser, generateAutoLoginUrl } from "@/lib/tutor-lms";

export const tutorLmsService = {
  getMapping(feedItemId: string) {
    return prisma.tutorLmsCourseMapping.findUnique({ where: { feedItemId } });
  },

  async upsertMapping(
    feedItemId: string,
    input: { tutorCourseId: number; priceInPaise: number; isActive?: boolean },
  ) {
    const feedItem = await prisma.feedItem.findUnique({ where: { id: feedItemId } });
    if (!feedItem || feedItem.type !== "TUTOR_LMS_COURSE") {
      throw new AppValidationError("Feed item not found or not a Tutor LMS course");
    }
    const data = {
      tutorCourseId: input.tutorCourseId,
      priceInPaise: input.priceInPaise,
      isActive: input.isActive ?? true,
    };
    return prisma.tutorLmsCourseMapping.upsert({
      where: { feedItemId },
      create: { feedItemId, ...data },
      update: data,
    });
  },

  listAllMapped() {
    return prisma.tutorLmsCourseMapping.findMany({
      include: { feedItem: { select: { id: true, title: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async hasAccess(userId: string, feedItemId: string): Promise<boolean> {
    const purchase = await prisma.purchase.findFirst({
      where: { userId, status: "PAID", purchasableType: "TUTOR_LMS_COURSE", feedItemId },
      select: { id: true },
    });
    return Boolean(purchase);
  },

  /**
   * Called once a Purchase for a TUTOR_LMS_COURSE is confirmed PAID —
   * find-or-creates the WordPress user and enrolls them in the mapped
   * course. Deliberately doesn't throw: a WordPress-side hiccup shouldn't
   * fail payment confirmation itself. getLaunchUrl re-attempts this as a
   * fallback if it's still missing by the time the student tries to launch.
   */
  async grantAccess(userId: string, feedItemId: string): Promise<void> {
    try {
      const [user, mapping] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.tutorLmsCourseMapping.findUnique({ where: { feedItemId } }),
      ]);
      if (!user || !mapping) return;

      let wpUserId = user.wordpressUserId;
      if (!wpUserId) {
        wpUserId = await findOrCreateWpUser(user.email, user.fullName);
        await prisma.user.update({ where: { id: userId }, data: { wordpressUserId: wpUserId } });
      }
      await enrollWpUser(wpUserId, mapping.tutorCourseId);
    } catch (error) {
      console.error("tutorLmsService.grantAccess failed", error);
    }
  },

  /** Returns a one-time login URL that drops the student straight into the mapped course. */
  async getLaunchUrl(userId: string, feedItemId: string): Promise<string> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppValidationError("User not found");

    if (!user.wordpressUserId) {
      // Fallback: grantAccess should have run at purchase time, but retry
      // here in case that earlier attempt failed silently.
      await tutorLmsService.grantAccess(userId, feedItemId);
    }

    const [refreshed, mapping] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.tutorLmsCourseMapping.findUnique({ where: { feedItemId } }),
    ]);
    if (!refreshed?.wordpressUserId) {
      throw new AppValidationError("Unable to set up your WordPress access — contact the site admin.");
    }
    const returnUrl = `${appUrl()}/feed/${feedItemId}/tutor-lms-course`;
    return generateAutoLoginUrl(refreshed.wordpressUserId, mapping?.tutorCourseId, returnUrl);
  },
};
