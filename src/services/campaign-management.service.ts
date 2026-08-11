import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { AppValidationError } from "@/lib/api";
import { appUrl } from "@/lib/env";
import { REFERRAL_PRIVACY_VERSION } from "@/lib/referral-commission";
import { prisma } from "@/lib/prisma";
import { maskName } from "@/lib/utils";
import { referralProfileService } from "@/services/referral-profile.service";
import type {
  campaignAssetSchema,
  campaignFaqSchema,
  campaignTermsSchema,
  extendMilestoneSchema,
  paymentAttachmentSchema,
} from "@/lib/validation";
import type { z } from "zod";

type AssetInput = z.infer<typeof campaignAssetSchema>;
type TermsInput = z.infer<typeof campaignTermsSchema>;
type FaqInput = z.infer<typeof campaignFaqSchema>;
type ExtendInput = z.infer<typeof extendMilestoneSchema>;
type ProofInput = z.infer<typeof paymentAttachmentSchema>;

const detailInclude = {
  milestones: { where: { isActive: true }, orderBy: { sequence: "asc" as const } },
  courses: { include: { learningPath: { select: { id: true, title: true, slug: true } } } },
  assets: { where: { isActive: true }, orderBy: { sortOrder: "asc" as const } },
  terms: { where: { isCurrent: true }, orderBy: { effectiveDate: "desc" as const }, take: 1 },
  faqs: { where: { isActive: true }, orderBy: { sortOrder: "asc" as const } },
  feedLinks: { include: { feedItem: { select: { id: true, title: true, status: true } } } },
  _count: { select: { participants: true, enrollments: true, transactions: true } },
} satisfies Prisma.ReferralCampaignInclude;

async function campaignAudit(input: {
  action: string;
  actorId?: string | null;
  campaignId?: string | null;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}) {
  await prisma.referralCampaignAuditLog.create({
    data: {
      action: input.action,
      actorId: input.actorId ?? null,
      campaignId: input.campaignId ?? null,
      oldValue: input.oldValue,
      newValue: input.newValue,
      ipAddress: input.ipAddress ?? null,
    },
  });
}

function addDays(base: Date, days: number | null | undefined) {
  if (days == null) return null;
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Marks a referral's milestone as APPROVED/PAID (mirroring its commission
 * transaction status) and, on approval, unlocks the next milestone in the
 * campaign sequence so the customer can see it (with a fresh due/expiry
 * date starting now). Safe to call even if the milestone isn't part of the
 * sequential pipeline (e.g. ad-hoc "Calculate commission" transactions).
 */
export async function syncReferralMilestoneOnCommissionStatus(
  referralMilestoneId: string | null | undefined,
  status: "APPROVED" | "PAID" | "REJECTED" | "CANCELLED",
) {
  if (!referralMilestoneId) return;
  const rm = await prisma.referralMilestone.findUnique({
    where: { id: referralMilestoneId },
  });
  if (!rm) return;

  const now = new Date();
  await prisma.referralMilestone.update({
    where: { id: referralMilestoneId },
    data: {
      status,
      ...(status === "APPROVED" ? { approvedAt: now } : {}),
      ...(status === "PAID" ? { paidAt: now, approvedAt: rm.approvedAt ?? now } : {}),
    },
  });

  if (status === "APPROVED" || status === "PAID") {
    await unlockNextMilestone(rm.referralId, rm.campaignId, rm.sequence);
  }
}

async function unlockNextMilestone(referralId: string, campaignId: string, fromSequence: number) {
  const next = await prisma.referralMilestone.findFirst({
    where: { referralId, campaignId, sequence: { gt: fromSequence }, unlockedAt: null },
    orderBy: { sequence: "asc" },
    include: { campaignMilestone: true },
  });
  if (!next) return;

  const now = new Date();
  await prisma.referralMilestone.update({
    where: { id: next.id },
    data: {
      unlockedAt: now,
      dueDate: addDays(now, next.campaignMilestone.defaultDueDays),
      expiryDate: addDays(now, next.campaignMilestone.defaultExpiryDays),
    },
  });
  await campaignAudit({
    action: "MILESTONE_UNLOCKED",
    campaignId,
    newValue: { referralId, referralMilestoneId: next.id, sequence: next.sequence },
  });
}

export const campaignManagementService = {
  detailInclude,

  listPublic() {
    const now = new Date();
    // Registration window defaults to the campaign's own startsAt/endsAt when not
    // explicitly overridden — a null registrationEndsAt must NOT mean "always open
    // forever"; it means "open for as long as the campaign itself runs". Missing the
    // end-date fallback here let campaigns keep showing as joinable long after their
    // endsAt had passed (verified: a campaign that ended 2026-07-31 was still listed
    // as "Active" and joinable on 2026-08-10).
    return prisma.referralCampaign.findMany({
      where: {
        isActive: true,
        status: { in: ["ACTIVE", "PAUSED"] },
        AND: [
          {
            OR: [
              { registrationStartsAt: { lte: now } },
              { AND: [{ registrationStartsAt: null }, { startsAt: { lte: now } }] },
            ],
          },
          {
            OR: [
              { registrationEndsAt: { gte: now } },
              { AND: [{ registrationEndsAt: null }, { endsAt: { gte: now } }] },
            ],
          },
        ],
      },
      include: {
        assets: { where: { isActive: true, assetType: { in: ["BANNER", "THUMBNAIL"] } } },
        milestones: { where: { isActive: true }, orderBy: { sequence: "asc" } },
        _count: { select: { participants: true } },
      },
      orderBy: [{ priority: "desc" }, { startsAt: "desc" }],
    });
  },

  getByCodeOrId(codeOrId: string) {
    return prisma.referralCampaign.findFirst({
      where: {
        OR: [{ id: codeOrId }, { campaignCode: codeOrId.toUpperCase() }],
      },
      include: detailInclude,
    });
  },

  async joinCampaign(userId: string, campaignId: string, termsAccepted: boolean) {
    if (!termsAccepted) throw new AppValidationError("Campaign terms must be accepted");
    await referralProfileService.requireEligible(userId);

    const campaign = await prisma.referralCampaign.findUnique({
      where: { id: campaignId },
      include: { terms: { where: { isCurrent: true }, take: 1 } },
    });
    if (!campaign || !campaign.isActive) throw new AppValidationError("Campaign not available");
    if (campaign.status !== "ACTIVE") throw new AppValidationError("Campaign is not open for joining");

    // Falls back to the campaign's own startsAt/endsAt when no explicit registration
    // window is set — see listPublic for why a null registrationEndsAt must not mean
    // "open forever" (it let learners join campaigns whose endsAt had long passed).
    const now = new Date();
    const registrationStart = campaign.registrationStartsAt ?? campaign.startsAt;
    const registrationEnd = campaign.registrationEndsAt ?? campaign.endsAt;
    if (registrationStart > now) {
      throw new AppValidationError("Campaign registration has not started");
    }
    if (registrationEnd < now) {
      throw new AppValidationError("Campaign registration has ended");
    }

    const termsVersion = campaign.terms[0]?.version ?? campaign.termsVersion;
    const existing = await prisma.referralCampaignParticipant.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
    });
    if (existing) throw new AppValidationError("You have already joined this campaign");

    const participant = await prisma.referralCampaignParticipant.create({
      data: {
        campaignId,
        userId,
        status: "ACTIVE",
        termsAccepted: true,
        termsVersion,
        acceptedAt: now,
        acceptedById: userId,
      },
    });
    await campaignAudit({
      action: "CAMPAIGN_JOINED",
      actorId: userId,
      campaignId,
      newValue: { termsVersion },
    });
    return participant;
  },

  /** Milestone pipelines for a referrer's own referrals, for the customer-facing progress view. */
  listReferralPipelines(userId: string) {
    return prisma.referral.findMany({
      where: { referrerId: userId, referralMilestones: { some: {} } },
      include: {
        referredUser: { select: { fullName: true } },
        referralMilestones: {
          orderBy: { sequence: "asc" },
          include: { campaign: { select: { id: true, name: true, campaignCode: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  listJoined(userId: string) {
    return prisma.referralCampaignParticipant.findMany({
      where: { userId, status: "ACTIVE" },
      include: {
        campaign: {
          include: {
            assets: { where: { assetType: "THUMBNAIL", isActive: true }, take: 1 },
            milestones: { where: { isActive: true }, orderBy: { sequence: "asc" } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });
  },

  async enrollReferral(referralId: string, campaignId: string, actorId: string) {
    const [referral, campaign] = await Promise.all([
      prisma.referral.findUnique({ where: { id: referralId } }),
      prisma.referralCampaign.findUnique({
        where: { id: campaignId },
        include: { milestones: { where: { isActive: true }, orderBy: { sequence: "asc" } } },
      }),
    ]);
    if (!referral) throw new AppValidationError("Referral not found");
    if (!campaign) throw new AppValidationError("Campaign not found");

    const enrollment = await prisma.referralCampaignEnrollment.upsert({
      where: { campaignId_referralId: { campaignId, referralId } },
      create: { campaignId, referralId },
      update: {},
    });

    const now = new Date();
    const firstSequence = campaign.milestones[0]?.sequence;
    for (const milestone of campaign.milestones) {
      // Only the first milestone unlocks immediately. Later milestones stay
      // locked (no due/expiry date, hidden from the customer) until the
      // preceding milestone in the sequence is approved.
      const unlockNow = milestone.sequence === firstSequence;
      await prisma.referralMilestone.upsert({
        where: {
          referralId_campaignMilestoneId: {
            referralId,
            campaignMilestoneId: milestone.id,
          },
        },
        create: {
          referralId,
          campaignId,
          campaignMilestoneId: milestone.id,
          name: milestone.name,
          sequence: milestone.sequence,
          trigger: milestone.trigger,
          calculationType: milestone.calculationType,
          value: milestone.value,
          commissionBasis: milestone.commissionBasis ?? campaign.commissionBasis,
          dueDate: unlockNow ? addDays(now, milestone.defaultDueDays) : null,
          expiryDate: unlockNow ? addDays(now, milestone.defaultExpiryDays) : null,
          unlockedAt: unlockNow ? now : null,
          status: "PENDING",
        },
        update: {},
      });
    }

    await campaignAudit({
      action: "REFERRAL_ENROLLED",
      actorId,
      campaignId,
      newValue: { referralId, milestones: campaign.milestones.length },
    });
    return enrollment;
  },

  async achieveMilestone(referralMilestoneId: string, actorId: string, paymentBasisAmount: number) {
    const rm = await prisma.referralMilestone.findUnique({
      where: { id: referralMilestoneId },
      include: { campaignMilestone: true, campaign: true },
    });
    if (!rm) throw new AppValidationError("Referral milestone not found");
    if (rm.campaign.status !== "ACTIVE") {
      throw new AppValidationError("Campaign is not active");
    }
    if (!rm.unlockedAt) {
      throw new AppValidationError("Milestone is locked until the previous milestone is approved");
    }
    if (rm.status === "EXPIRED") throw new AppValidationError("Milestone has expired");
    // APPROVED/PAID mean a commission has already been signed off — re-running
    // achieve here must not be allowed to reset that decision back to PENDING.
    if (["APPROVED", "PAID", "CANCELLED", "REJECTED"].includes(rm.status)) {
      throw new AppValidationError(`Milestone is ${rm.status}`);
    }
    if (rm.expiryDate && rm.expiryDate < new Date() && rm.campaignMilestone.autoExpire) {
      await prisma.referralMilestone.update({
        where: { id: rm.id },
        data: { status: "EXPIRED" },
      });
      throw new AppValidationError("Milestone expired");
    }

    const existingTxn = await prisma.referralCommissionTransaction.findUnique({
      where: {
        referralId_milestoneId: {
          referralId: rm.referralId,
          milestoneId: rm.campaignMilestoneId,
        },
      },
    });
    if (existingTxn && existingTxn.status !== "PENDING") {
      throw new AppValidationError("Commission for this milestone has already been processed");
    }

    const { calculateCommissionAmount } = await import("@/lib/referral-commission");
    const calculatedAmount = calculateCommissionAmount({
      calculationType: rm.calculationType,
      value: Number(rm.value),
      paymentBasisAmount,
    });

    const updated = await prisma.referralMilestone.update({
      where: { id: rm.id },
      data: { status: "ACHIEVED", achievedAt: new Date() },
    });

    const txn = await prisma.referralCommissionTransaction.upsert({
      where: {
        referralId_milestoneId: {
          referralId: rm.referralId,
          milestoneId: rm.campaignMilestoneId,
        },
      },
      create: {
        referralId: rm.referralId,
        campaignId: rm.campaignId,
        milestoneId: rm.campaignMilestoneId,
        referralMilestoneId: rm.id,
        calculationType: rm.calculationType,
        value: rm.value,
        paymentBasisAmount,
        calculatedAmount,
        commissionBasis: rm.commissionBasis,
        trigger: rm.trigger,
        status: "PENDING",
      },
      update: {
        referralMilestoneId: rm.id,
        paymentBasisAmount,
        calculatedAmount,
        status: "PENDING",
      },
    });

    await campaignAudit({
      action: "MILESTONE_ACHIEVED",
      actorId,
      campaignId: rm.campaignId,
      newValue: { referralMilestoneId, transactionId: txn.id, calculatedAmount },
    });
    return { milestone: updated, transaction: txn };
  },

  async extendMilestone(id: string, input: ExtendInput, actorId: string) {
    const rm = await prisma.referralMilestone.findUnique({
      where: { id },
      include: { campaignMilestone: true },
    });
    if (!rm) throw new AppValidationError("Referral milestone not found");
    if (!rm.campaignMilestone.allowExtension) {
      throw new AppValidationError("Extensions are not allowed for this milestone");
    }
    if (rm.campaignMilestone.maxExtensionDays != null && rm.expiryDate) {
      const max = addDays(rm.expiryDate, rm.campaignMilestone.maxExtensionDays);
      if (max && input.newExpiryDate > max) {
        throw new AppValidationError("Extension exceeds maximum allowed days");
      }
    }
    const updated = await prisma.referralMilestone.update({
      where: { id },
      data: {
        expiryDate: input.newExpiryDate,
        extendedById: actorId,
        extensionDate: new Date(),
        extensionReason: input.reason,
        status: rm.status === "EXPIRED" ? "PENDING" : rm.status,
      },
    });
    await campaignAudit({
      action: "MILESTONE_EXTENDED",
      actorId,
      campaignId: rm.campaignId,
      oldValue: { expiryDate: rm.expiryDate?.toISOString() },
      newValue: { expiryDate: input.newExpiryDate.toISOString(), reason: input.reason },
    });
    return updated;
  },

  /** Unlocked, still-open milestones expiring within `days` — for admin heads-up before revenue silently lapses. */
  expiringSoon(days = 7) {
    const now = new Date();
    const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return prisma.referralMilestone.findMany({
      where: {
        status: { in: ["PENDING", "ACHIEVED"] },
        unlockedAt: { not: null },
        expiryDate: { gte: now, lte: horizon },
      },
      include: {
        campaign: { select: { id: true, name: true, campaignCode: true } },
        referral: {
          select: {
            code: true,
            referrer: { select: { fullName: true, email: true } },
            referredUser: { select: { fullName: true, email: true } },
          },
        },
      },
      orderBy: { expiryDate: "asc" },
    });
  },

  async expireDueMilestones() {
    const now = new Date();
    const result = await prisma.referralMilestone.updateMany({
      where: {
        status: { in: ["PENDING", "ACHIEVED"] },
        expiryDate: { lt: now },
        campaignMilestone: { autoExpire: true },
      },
      data: { status: "EXPIRED" },
    });
    return { expired: result.count };
  },

  addAsset(campaignId: string, input: AssetInput, actorId: string) {
    return prisma.$transaction(async (tx) => {
      const asset = await tx.referralCampaignAsset.create({
        data: { campaignId, ...input, fileType: input.fileType ?? null, fileSize: input.fileSize ?? null },
      });
      await tx.referralCampaignAuditLog.create({
        data: {
          action: "ASSET_UPLOADED",
          actorId,
          campaignId,
          newValue: { assetType: input.assetType, fileUrl: input.fileUrl },
        },
      });
      return asset;
    });
  },

  async deleteAsset(campaignId: string, assetId: string, actorId: string) {
    const asset = await prisma.referralCampaignAsset.findFirst({
      where: { id: assetId, campaignId },
    });
    if (!asset) throw new AppValidationError("Asset not found");

    await prisma.referralCampaignAsset.delete({ where: { id: assetId } });
    const { removeMediaFile } = await import("@/lib/media-upload");
    const storageResult = await removeMediaFile(asset.fileUrl);

    await campaignAudit({
      action: "ASSET_DELETED",
      actorId,
      campaignId,
      oldValue: {
        assetId,
        assetType: asset.assetType,
        fileUrl: asset.fileUrl,
        fileName: asset.fileName,
        storageRemoved: storageResult.removed,
      },
    });
    return { ok: true, storageResult };
  },

  async deletePaymentAttachment(attachmentId: string, actorId: string) {
    const attachment = await prisma.referralPaymentAttachment.findUnique({
      where: { id: attachmentId },
      include: { payment: { select: { id: true, transactionId: true } } },
    });
    if (!attachment) throw new AppValidationError("Attachment not found");

    await prisma.referralPaymentAttachment.delete({ where: { id: attachmentId } });
    const { removeMediaFile } = await import("@/lib/media-upload");
    const storageResult = await removeMediaFile(attachment.fileUrl);

    await campaignAudit({
      action: "PAYMENT_PROOF_DELETED",
      actorId,
      newValue: {
        attachmentId,
        paymentId: attachment.paymentId,
        fileUrl: attachment.fileUrl,
        storageRemoved: storageResult.removed,
      },
    });
    return { ok: true, storageResult };
  },

  async upsertTerms(campaignId: string, input: TermsInput, actorId: string) {
    if (input.isCurrent) {
      await prisma.referralCampaignTerms.updateMany({
        where: { campaignId, isCurrent: true },
        data: { isCurrent: false },
      });
    }
    const terms = await prisma.referralCampaignTerms.upsert({
      where: { campaignId_version: { campaignId, version: input.version } },
      create: { campaignId, ...input },
      update: { content: input.content, effectiveDate: input.effectiveDate, isCurrent: input.isCurrent },
    });
    await prisma.referralCampaign.update({
      where: { id: campaignId },
      data: { termsVersion: input.version },
    });
    await campaignAudit({
      action: "TERMS_UPDATED",
      actorId,
      campaignId,
      newValue: { version: input.version },
    });
    return terms;
  },

  addFaq(campaignId: string, input: FaqInput, actorId: string) {
    return prisma.$transaction(async (tx) => {
      const faq = await tx.referralCampaignFaq.create({ data: { campaignId, ...input } });
      await tx.referralCampaignAuditLog.create({
        data: { action: "FAQ_ADDED", actorId, campaignId, newValue: { question: input.question } },
      });
      return faq;
    });
  },

  async cloneCampaign(campaignId: string, actorId: string) {
    const source = await prisma.referralCampaign.findUnique({
      where: { id: campaignId },
      include: {
        milestones: true,
        courses: true,
        assets: true,
        terms: { where: { isCurrent: true }, take: 1 },
        faqs: true,
      },
    });
    if (!source) throw new AppValidationError("Campaign not found");

    const code = `CMP-${randomBytes(3).toString("hex").toUpperCase()}`;
    const clone = await prisma.referralCampaign.create({
      data: {
        name: `${source.name} (Copy)`,
        shortTitle: source.shortTitle,
        description: source.description,
        campaignCode: code,
        startsAt: source.startsAt,
        endsAt: source.endsAt,
        registrationStartsAt: source.registrationStartsAt,
        registrationEndsAt: source.registrationEndsAt,
        referralStartsAt: source.referralStartsAt,
        referralEndsAt: source.referralEndsAt,
        status: "DRAFT",
        priority: source.priority,
        maxReferrals: source.maxReferrals,
        isActive: false,
        termsVersion: source.termsVersion,
        commissionType: source.commissionType,
        commissionBasis: source.commissionBasis,
        publishAsFeed: false,
        clonedFromId: source.id,
        courses: { create: source.courses.map((c) => ({ learningPathId: c.learningPathId })) },
        milestones: {
          create: source.milestones.map((m) => ({
            name: m.name,
            sequence: m.sequence,
            trigger: m.trigger,
            calculationType: m.calculationType,
            value: m.value,
            commissionBasis: m.commissionBasis,
            defaultDueDays: m.defaultDueDays,
            defaultExpiryDays: m.defaultExpiryDays,
            allowOverride: m.allowOverride,
            allowExtension: m.allowExtension,
            maxExtensionDays: m.maxExtensionDays,
            autoExpire: m.autoExpire,
            isActive: m.isActive,
          })),
        },
        assets: {
          create: source.assets.map((a) => ({
            assetType: a.assetType,
            fileName: a.fileName,
            fileUrl: a.fileUrl,
            fileType: a.fileType,
            fileSize: a.fileSize,
            sortOrder: a.sortOrder,
            isActive: a.isActive,
          })),
        },
        faqs: {
          create: source.faqs.map((f) => ({
            question: f.question,
            answer: f.answer,
            sortOrder: f.sortOrder,
            isActive: f.isActive,
          })),
        },
        terms: source.terms[0]
          ? {
              create: {
                version: source.terms[0].version,
                content: source.terms[0].content,
                effectiveDate: source.terms[0].effectiveDate,
                isCurrent: true,
              },
            }
          : undefined,
      },
    });
    await campaignAudit({
      action: "CAMPAIGN_CLONED",
      actorId,
      campaignId: clone.id,
      newValue: { from: campaignId },
    });
    return clone;
  },

  async setStatus(campaignId: string, status: "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED" | "ARCHIVED", actorId: string) {
    const campaign = await prisma.referralCampaign.update({
      where: { id: campaignId },
      data: {
        status,
        isActive: status === "ACTIVE" || status === "PAUSED",
      },
    });
    await campaignAudit({
      action: status === "ARCHIVED" ? "CAMPAIGN_ARCHIVED" : `CAMPAIGN_${status}`,
      actorId,
      campaignId,
      newValue: { status },
    });
    return campaign;
  },

  async publishAsFeed(campaignId: string, actorId: string) {
    const campaign = await prisma.referralCampaign.findUnique({
      where: { id: campaignId },
      include: {
        assets: { where: { assetType: "BANNER", isActive: true }, take: 1 },
      },
    });
    if (!campaign) throw new AppValidationError("Campaign not found");

    const category =
      (await prisma.feedCategory.findFirst({ where: { slug: "announcements" } })) ||
      (await prisma.feedCategory.findFirst());
    if (!category) throw new AppValidationError("No feed category available for publishing");

    const banner = campaign.assets[0]?.fileUrl ?? null;
    const feedItem = await prisma.feedItem.create({
      data: {
        title: campaign.shortTitle || campaign.name,
        description: campaign.description || `Join the ${campaign.name} referral campaign.`,
        thumbnailUrl: banner,
        categoryId: category.id,
        type: "INTERNAL_PROMOTION",
        externalUrl: `${appUrl()}/referral-campaigns/${campaign.campaignCode}`,
        status: "PUBLISHED",
        publishedAt: new Date(),
        priority: campaign.priority,
        isFeatured: true,
        content: {
          cta: "View campaign",
          campaignId: campaign.id,
          expiresAt: campaign.endsAt.toISOString(),
        },
      },
    });

    await prisma.campaignFeedLink.create({
      data: { campaignId, feedItemId: feedItem.id },
    });
    await prisma.referralCampaign.update({
      where: { id: campaignId },
      data: { publishAsFeed: true },
    });
    await campaignAudit({
      action: "CAMPAIGN_PUBLISHED_FEED",
      actorId,
      campaignId,
      newValue: { feedItemId: feedItem.id },
    });
    return feedItem;
  },

  async addPaymentProof(paymentId: string, input: ProofInput, actorId: string) {
    const payment = await prisma.referralCommissionPayment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new AppValidationError("Payment not found");
    const normalizedType = input.fileType.toLowerCase().includes("pdf")
      ? "application/pdf"
      : input.fileType.toLowerCase().includes("png")
        ? "image/png"
        : "image/jpeg";
    const attachment = await prisma.referralPaymentAttachment.create({
      data: {
        paymentId,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        fileType: normalizedType,
        fileSize: input.fileSize ?? null,
        uploadedById: actorId,
      },
    });
    await campaignAudit({
      action: "PAYMENT_PROOF_UPLOADED",
      actorId,
      newValue: { paymentId, fileName: input.fileName },
    });
    return attachment;
  },

  /**
   * Top referrers for a campaign, ranked by successful (non-rejected) referral
   * count. Names are masked to "First L." since this is visible to any signed-in
   * participant on the campaign page, not just admins.
   */
  async leaderboard(campaignId: string, limit = 10) {
    const enrollments = await prisma.referralCampaignEnrollment.findMany({
      where: { campaignId },
      include: {
        referral: {
          select: {
            referrerId: true,
            status: true,
            referrer: { select: { fullName: true } },
          },
        },
      },
    });

    const byReferrer = new Map<string, { name: string; count: number }>();
    for (const enrollment of enrollments) {
      if (enrollment.referral.status === "REJECTED") continue;
      const key = enrollment.referral.referrerId;
      const entry = byReferrer.get(key) ?? { name: enrollment.referral.referrer.fullName, count: 0 };
      entry.count += 1;
      byReferrer.set(key, entry);
    }

    return [...byReferrer.entries()]
      .map(([referrerId, { name, count }]) => ({
        referrerId,
        displayName: maskName(name),
        successfulReferrals: count,
      }))
      .sort((a, b) => b.successfulReferrals - a.successfulReferrals)
      .slice(0, limit);
  },

  shareLinks(campaign: { campaignCode: string }, partnerCode?: string | null) {
    const base = appUrl();
    const campaignUrl = `${base}/referral-campaigns/${campaign.campaignCode}`;
    const referralUrl = partnerCode
      ? `${base}/register?ref=${partnerCode}&campaign=${campaign.campaignCode}`
      : campaignUrl;
    return {
      campaignUrl,
      referralUrl,
      shareLinks: {
        whatsapp: `https://wa.me/?text=${encodeURIComponent(`Join this referral campaign: ${referralUrl}`)}`,
        email: `mailto:?subject=${encodeURIComponent("Referral campaign")}&body=${encodeURIComponent(referralUrl)}`,
      },
      qrReady: true,
      qrPayload: referralUrl,
    };
  },

  privacyVersion: REFERRAL_PRIVACY_VERSION,
};
