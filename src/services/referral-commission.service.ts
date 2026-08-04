import type {
  Prisma,
  ReferralCampaignStatus,
  ReferralMilestoneTrigger,
} from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";
import { AppValidationError } from "@/lib/api";
import {
  assertMilestoneMatchesCampaignType,
  calculateCommissionAmount,
} from "@/lib/referral-commission";
import { prisma } from "@/lib/prisma";
import type {
  commissionCalculateSchema,
  commissionPaymentSchema,
  referralCampaignMilestoneSchema,
  referralCampaignSchema,
} from "@/lib/validation";
import type { z } from "zod";

type CampaignInput = z.infer<typeof referralCampaignSchema>;
type MilestoneInput = z.infer<typeof referralCampaignMilestoneSchema>;
type CalculateInput = z.infer<typeof commissionCalculateSchema>;
type PaymentInput = z.infer<typeof commissionPaymentSchema>;

const txnInclude = {
  referral: {
    include: {
      referrer: { select: { id: true, fullName: true, email: true } },
      referredUser: { select: { id: true, fullName: true, email: true } },
    },
  },
  campaign: true,
  milestone: true,
  learningPath: { select: { id: true, title: true, slug: true } },
  payment: {
    include: {
      paidBy: { select: { id: true, fullName: true, email: true } },
      attachments: true,
    },
  },
  approvedBy: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.ReferralCommissionTransactionInclude;

async function writeAudit(input: {
  action: string;
  actorId?: string | null;
  transactionId?: string | null;
  campaignId?: string | null;
  details?: Prisma.InputJsonValue;
}) {
  await prisma.referralCommissionAuditEvent.create({
    data: {
      action: input.action,
      actorId: input.actorId ?? null,
      transactionId: input.transactionId ?? null,
      campaignId: input.campaignId ?? null,
      details: input.details,
    },
  });
}

function money(value: { toString(): string } | number | string | null | undefined) {
  if (value == null) return 0;
  return Number(value.toString());
}

export const referralCampaignService = {
  list() {
    return prisma.referralCampaign.findMany({
      include: {
        milestones: { orderBy: { sequence: "asc" } },
        courses: { include: { learningPath: { select: { id: true, title: true, slug: true } } } },
        _count: { select: { transactions: true } },
      },
      orderBy: [{ priority: "desc" }, { startsAt: "desc" }],
    });
  },

  get(id: string) {
    return prisma.referralCampaign.findUnique({
      where: { id },
      include: {
        milestones: { orderBy: { sequence: "asc" } },
        courses: { include: { learningPath: { select: { id: true, title: true, slug: true } } } },
        assets: { orderBy: { sortOrder: "asc" } },
        terms: { orderBy: { effectiveDate: "desc" } },
        faqs: { orderBy: { sortOrder: "asc" } },
        _count: { select: { transactions: true, participants: true } },
      },
    });
  },

  async create(input: CampaignInput, actorId: string) {
    const campaignCode =
      input.campaignCode?.toUpperCase() ||
      `CMP-${Date.now().toString(36).toUpperCase()}`;
    const campaign = await prisma.referralCampaign.create({
      data: {
        name: input.name,
        shortTitle: input.shortTitle ?? null,
        description: input.description ?? null,
        campaignCode,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        registrationStartsAt: input.registrationStartsAt ?? input.startsAt,
        registrationEndsAt: input.registrationEndsAt ?? input.endsAt,
        referralStartsAt: input.referralStartsAt ?? input.startsAt,
        referralEndsAt: input.referralEndsAt ?? input.endsAt,
        status: input.status,
        priority: input.priority,
        maxReferrals: input.maxReferrals ?? null,
        isActive: input.isActive,
        termsVersion: input.termsVersion,
        commissionType: input.commissionType,
        commissionBasis: input.commissionBasis,
        publishAsFeed: input.publishAsFeed,
        courses: {
          create: input.learningPathIds.map((learningPathId) => ({ learningPathId })),
        },
      },
      include: {
        milestones: true,
        courses: { include: { learningPath: { select: { id: true, title: true, slug: true } } } },
      },
    });
    await writeAudit({
      action: "CAMPAIGN_CREATED",
      actorId,
      campaignId: campaign.id,
      details: { name: campaign.name, commissionType: campaign.commissionType },
    });
    return campaign;
  },

  async update(id: string, input: CampaignInput, actorId: string) {
    await prisma.referralCampaignCourse.deleteMany({ where: { campaignId: id } });
    const campaign = await prisma.referralCampaign.update({
      where: { id },
      data: {
        name: input.name,
        shortTitle: input.shortTitle ?? null,
        description: input.description ?? null,
        ...(input.campaignCode ? { campaignCode: input.campaignCode.toUpperCase() } : {}),
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        registrationStartsAt: input.registrationStartsAt ?? null,
        registrationEndsAt: input.registrationEndsAt ?? null,
        referralStartsAt: input.referralStartsAt ?? null,
        referralEndsAt: input.referralEndsAt ?? null,
        status: input.status,
        priority: input.priority,
        maxReferrals: input.maxReferrals ?? null,
        isActive: input.isActive,
        termsVersion: input.termsVersion,
        commissionType: input.commissionType,
        commissionBasis: input.commissionBasis,
        publishAsFeed: input.publishAsFeed,
        courses: {
          create: input.learningPathIds.map((learningPathId) => ({ learningPathId })),
        },
      },
      include: {
        milestones: { orderBy: { sequence: "asc" } },
        courses: { include: { learningPath: { select: { id: true, title: true, slug: true } } } },
      },
    });
    await writeAudit({
      action: "CAMPAIGN_UPDATED",
      actorId,
      campaignId: id,
      details: { status: campaign.status, priority: campaign.priority },
    });
    return campaign;
  },

  async addMilestone(campaignId: string, input: MilestoneInput, actorId: string) {
    const campaign = await prisma.referralCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new AppValidationError("Campaign not found");
    assertMilestoneMatchesCampaignType(campaign.commissionType, input.calculationType);

    try {
      const milestone = await prisma.referralCampaignMilestone.create({
        data: {
          campaignId,
          name: input.name,
          sequence: input.sequence,
          trigger: input.trigger,
          calculationType: input.calculationType,
          value: input.value,
          commissionBasis: input.commissionBasis ?? null,
          defaultDueDays: input.defaultDueDays ?? null,
          defaultExpiryDays: input.defaultExpiryDays ?? null,
          allowOverride: input.allowOverride,
          allowExtension: input.allowExtension,
          maxExtensionDays: input.maxExtensionDays ?? null,
          autoExpire: input.autoExpire,
          isActive: input.isActive,
        },
      });
      await writeAudit({
        action: "MILESTONE_CREATED",
        actorId,
        campaignId,
        details: { milestoneId: milestone.id, trigger: milestone.trigger, value: input.value },
      });
      return milestone;
    } catch (error) {
      if (
        error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppValidationError(
          `Sequence ${input.sequence} already exists for this campaign. Use the next sequence number.`,
        );
      }
      throw error;
    }
  },

  async updateMilestone(milestoneId: string, input: MilestoneInput, actorId: string) {
    const existing = await prisma.referralCampaignMilestone.findUnique({
      where: { id: milestoneId },
      include: { campaign: true },
    });
    if (!existing) throw new AppValidationError("Milestone not found");
    assertMilestoneMatchesCampaignType(existing.campaign.commissionType, input.calculationType);

    const milestone = await prisma.referralCampaignMilestone.update({
      where: { id: milestoneId },
      data: {
        name: input.name,
        sequence: input.sequence,
        trigger: input.trigger,
        calculationType: input.calculationType,
        value: input.value,
        commissionBasis: input.commissionBasis ?? null,
        defaultDueDays: input.defaultDueDays ?? null,
        defaultExpiryDays: input.defaultExpiryDays ?? null,
        allowOverride: input.allowOverride,
        allowExtension: input.allowExtension,
        maxExtensionDays: input.maxExtensionDays ?? null,
        autoExpire: input.autoExpire,
        isActive: input.isActive,
      },
    });
    await writeAudit({
      action: "MILESTONE_UPDATED",
      actorId,
      campaignId: existing.campaignId,
      details: { milestoneId, trigger: milestone.trigger },
    });
    return milestone;
  },

  async deleteMilestone(milestoneId: string, actorId: string) {
    const existing = await prisma.referralCampaignMilestone.findUnique({ where: { id: milestoneId } });
    if (!existing) throw new AppValidationError("Milestone not found");
    const txnCount = await prisma.referralCommissionTransaction.count({ where: { milestoneId } });
    if (txnCount > 0) {
      throw new AppValidationError("Cannot delete a milestone that already has commission transactions");
    }
    await prisma.referralCampaignMilestone.delete({ where: { id: milestoneId } });
    await writeAudit({
      action: "MILESTONE_DELETED",
      actorId,
      campaignId: existing.campaignId,
      details: { milestoneId },
    });
  },
};

export const referralCommissionService = {
  async resolveCampaign(input: {
    campaignId?: string;
    learningPathId?: string | null;
    at?: Date;
  }) {
    const at = input.at ?? new Date();
    if (input.campaignId) {
      const campaign = await prisma.referralCampaign.findUnique({
        where: { id: input.campaignId },
        include: {
          milestones: { where: { isActive: true }, orderBy: { sequence: "asc" } },
          courses: true,
        },
      });
      if (!campaign) throw new AppValidationError("Campaign not found");
      if (campaign.startsAt > at || campaign.endsAt < at) {
        throw new AppValidationError("Campaign is not within its active date window");
      }
      return campaign;
    }

    const campaigns = await prisma.referralCampaign.findMany({
      where: {
        status: "ACTIVE" satisfies ReferralCampaignStatus,
        startsAt: { lte: at },
        endsAt: { gte: at },
      },
      include: {
        milestones: { where: { isActive: true }, orderBy: { sequence: "asc" } },
        courses: true,
      },
      orderBy: [{ priority: "desc" }, { startsAt: "desc" }],
    });

    const matched = campaigns.find((campaign) => {
      if (campaign.courses.length === 0) return true;
      if (!input.learningPathId) return false;
      return campaign.courses.some((course) => course.learningPathId === input.learningPathId);
    });

    if (!matched) {
      throw new AppValidationError("No active commission campaign matches this referral/course");
    }
    return matched;
  },

  async calculate(input: CalculateInput, actorId: string) {
    const referral = await prisma.referral.findUnique({
      where: { id: input.referralId },
    });
    if (!referral) throw new AppValidationError("Referral not found");
    if (referral.status === "REJECTED") {
      throw new AppValidationError("Rejected referrals cannot earn commission");
    }

    const campaign = await this.resolveCampaign({
      campaignId: input.campaignId,
      learningPathId: input.learningPathId,
    });

    if (campaign.status !== "ACTIVE") {
      throw new AppValidationError("Campaign must be ACTIVE to generate commission");
    }

    if (campaign.courses.length > 0 && input.learningPathId) {
      const eligible = campaign.courses.some((c) => c.learningPathId === input.learningPathId);
      if (!eligible) {
        throw new AppValidationError("Selected course is not eligible for this campaign");
      }
    }

    let milestones = campaign.milestones.filter((m) => m.trigger === input.trigger);
    if (input.milestoneIds?.length) {
      milestones = milestones.filter((m) => input.milestoneIds!.includes(m.id));
    }
    if (milestones.length === 0) {
      throw new AppValidationError("No active milestones match this trigger");
    }

    // maxReferrals check + transaction creation run inside a single serializable
    // transaction so concurrent calculate() calls on the same campaign can't both
    // pass the cap check and jointly exceed campaign.maxReferrals.
    type CreatedTxn = Prisma.ReferralCommissionTransactionGetPayload<{ include: typeof txnInclude }>;
    let created: CreatedTxn[];
    try {
      created = await prisma.$transaction(
        async (tx) => {
          if (campaign.maxReferrals != null) {
            const distinctReferrals = await tx.referralCommissionTransaction.groupBy({
              by: ["referralId"],
              where: { campaignId: campaign.id },
            });
            const alreadyCounted = distinctReferrals.some((row) => row.referralId === referral.id);
            if (!alreadyCounted && distinctReferrals.length >= campaign.maxReferrals) {
              throw new AppValidationError("Campaign has reached its maximum referrals");
            }
          }

          const createdTxns = [];
          for (const milestone of milestones) {
            assertMilestoneMatchesCampaignType(campaign.commissionType, milestone.calculationType);
            const calculatedAmount = calculateCommissionAmount({
              calculationType: milestone.calculationType,
              value: Number(milestone.value),
              paymentBasisAmount: input.paymentBasisAmount,
            });

            const existing = await tx.referralCommissionTransaction.findUnique({
              where: {
                referralId_milestoneId: {
                  referralId: referral.id,
                  milestoneId: milestone.id,
                },
              },
            });
            if (existing) continue;

            const txn = await tx.referralCommissionTransaction.create({
              data: {
                referralId: referral.id,
                campaignId: campaign.id,
                milestoneId: milestone.id,
                learningPathId: input.learningPathId ?? null,
                calculationType: milestone.calculationType,
                value: milestone.value,
                paymentBasisAmount: input.paymentBasisAmount,
                calculatedAmount,
                commissionBasis: campaign.commissionBasis,
                trigger: input.trigger,
                status: "PENDING",
              },
              include: txnInclude,
            });
            await tx.referralCommissionAuditEvent.create({
              data: {
                action: "COMMISSION_CALCULATED",
                actorId,
                transactionId: txn.id,
                campaignId: campaign.id,
                details: {
                  trigger: input.trigger,
                  calculatedAmount: money(calculatedAmount),
                  paymentBasisAmount: input.paymentBasisAmount,
                },
              },
            });
            createdTxns.push(txn);
          }
          return createdTxns;
        },
        { isolationLevel: PrismaNamespace.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        throw new AppValidationError(
          "This campaign is busy processing another commission calculation — please retry.",
        );
      }
      throw error;
    }

    return { campaign, created, skipped: milestones.length - created.length };
  },

  listTransactions(filters: {
    referrerId?: string;
    status?: string;
    campaignId?: string;
    from?: Date;
    to?: Date;
  } = {}) {
    return prisma.referralCommissionTransaction.findMany({
      where: {
        ...(filters.status
          ? { status: filters.status as Prisma.EnumReferralCommissionTxnStatusFilter["equals"] }
          : {}),
        ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
        ...(filters.referrerId ? { referral: { referrerId: filters.referrerId } } : {}),
        ...(filters.from || filters.to
          ? {
              transactionDate: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      include: txnInclude,
      orderBy: { transactionDate: "desc" },
    });
  },

  async updateStatus(
    id: string,
    status: "PENDING" | "APPROVED" | "PAID" | "REJECTED" | "CANCELLED",
    actorId: string,
    statusReason?: string | null,
  ) {
    const existing = await prisma.referralCommissionTransaction.findUnique({ where: { id } });
    if (!existing) throw new AppValidationError("Commission transaction not found");
    if (existing.status === "PAID" && status !== "PAID") {
      throw new AppValidationError("Paid transactions cannot change status here");
    }
    if (status === "PAID") {
      throw new AppValidationError("Use the payment processing API to mark commissions as Paid");
    }

    const updated = await prisma.referralCommissionTransaction.update({
      where: { id },
      data: {
        status,
        statusReason: statusReason ?? null,
        ...(status === "APPROVED"
          ? { approvedById: actorId, approvedAt: new Date() }
          : {}),
      },
      include: txnInclude,
    });
    if (status !== "PENDING") {
      const { syncReferralMilestoneOnCommissionStatus } = await import(
        "@/services/campaign-management.service"
      );
      await syncReferralMilestoneOnCommissionStatus(existing.referralMilestoneId, status);
    }
    await writeAudit({
      action: `COMMISSION_${status}`,
      actorId,
      transactionId: id,
      campaignId: existing.campaignId,
      details: { from: existing.status, to: status, statusReason },
    });
    return updated;
  },

  async recordPayment(input: PaymentInput, actorId: string) {
    const txn = await prisma.referralCommissionTransaction.findUnique({
      where: { id: input.transactionId },
      include: { payment: true },
    });
    if (!txn) throw new AppValidationError("Commission transaction not found");
    if (txn.payment) throw new AppValidationError("Payment already recorded for this transaction");
    if (!["APPROVED", "PENDING"].includes(txn.status)) {
      throw new AppValidationError("Only pending or approved commissions can be paid");
    }

    const amountPaid = input.amountPaid ?? money(txn.calculatedAmount);
    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.referralCommissionPayment.create({
        data: {
          transactionId: txn.id,
          paymentDate: input.paymentDate,
          amountPaid,
          paymentMethod: input.paymentMethod,
          referenceNumber: input.referenceNumber ?? null,
          remarks: input.remarks ?? null,
          paidById: actorId,
        },
        include: {
          paidBy: { select: { id: true, fullName: true, email: true } },
          attachments: true,
          transaction: { include: txnInclude },
        },
      });
      await tx.referralCommissionTransaction.update({
        where: { id: txn.id },
        data: {
          status: "PAID",
          approvedById: txn.approvedById ?? actorId,
          approvedAt: txn.approvedAt ?? new Date(),
        },
      });
      return created;
    });

    const { syncReferralMilestoneOnCommissionStatus } = await import(
      "@/services/campaign-management.service"
    );
    await syncReferralMilestoneOnCommissionStatus(txn.referralMilestoneId, "PAID");

    await writeAudit({
      action: "COMMISSION_PAID",
      actorId,
      transactionId: txn.id,
      campaignId: txn.campaignId,
      details: {
        amountPaid,
        paymentMethod: input.paymentMethod,
        referenceNumber: input.referenceNumber,
        paymentDate: input.paymentDate.toISOString(),
      },
    });
    return payment;
  },

  async summary(referrerId?: string) {
    const rows = await prisma.referralCommissionTransaction.groupBy({
      by: ["status"],
      where: referrerId ? { referral: { referrerId } } : undefined,
      _sum: { calculatedAmount: true },
      _count: true,
    });

    const byStatus = Object.fromEntries(
      rows.map((row) => [
        row.status,
        { count: row._count, amount: money(row._sum.calculatedAmount) },
      ]),
    );

    const totalEarned = rows.reduce((sum, row) => sum + money(row._sum.calculatedAmount), 0);
    return {
      totalEarned,
      pending: byStatus.PENDING ?? { count: 0, amount: 0 },
      approved: byStatus.APPROVED ?? { count: 0, amount: 0 },
      paid: byStatus.PAID ?? { count: 0, amount: 0 },
      rejected: byStatus.REJECTED ?? { count: 0, amount: 0 },
      cancelled: byStatus.CANCELLED ?? { count: 0, amount: 0 },
    };
  },

  async reports(filters: {
    from?: Date;
    to?: Date;
    campaignId?: string;
    referrerId?: string;
  } = {}) {
    const transactions = await this.listTransactions(filters);
    const payments = await prisma.referralCommissionPayment.findMany({
      where: {
        ...(filters.from || filters.to
          ? {
              paymentDate: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
        ...(filters.campaignId ? { transaction: { campaignId: filters.campaignId } } : {}),
        ...(filters.referrerId
          ? { transaction: { referral: { referrerId: filters.referrerId } } }
          : {}),
      },
      include: {
        paidBy: { select: { id: true, fullName: true, email: true } },
        attachments: true,
        transaction: { include: txnInclude },
      },
      orderBy: { paymentDate: "desc" },
    });

    const byMonth = new Map<string, number>();
    const byCampaign = new Map<string, { name: string; amount: number }>();
    const byCourse = new Map<string, { name: string; amount: number }>();
    const byReferrer = new Map<string, { name: string; amount: number }>();
    const byOfficer = new Map<string, { name: string; amount: number }>();

    for (const txn of transactions) {
      const amount = money(txn.calculatedAmount);
      const monthKey = txn.transactionDate.toISOString().slice(0, 7);
      byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + amount);

      byCampaign.set(txn.campaignId, {
        name: txn.campaign.name,
        amount: (byCampaign.get(txn.campaignId)?.amount ?? 0) + amount,
      });

      const courseKey = txn.learningPathId ?? "unassigned";
      byCourse.set(courseKey, {
        name: txn.learningPath?.title ?? "Unassigned",
        amount: (byCourse.get(courseKey)?.amount ?? 0) + amount,
      });

      byReferrer.set(txn.referral.referrerId, {
        name: txn.referral.referrer.fullName,
        amount: (byReferrer.get(txn.referral.referrerId)?.amount ?? 0) + amount,
      });
    }

    for (const payment of payments) {
      byOfficer.set(payment.paidById, {
        name: payment.paidBy.fullName,
        amount: (byOfficer.get(payment.paidById)?.amount ?? 0) + money(payment.amountPaid),
      });
    }

    return {
      summary: await this.summary(filters.referrerId),
      transactions,
      payments,
      charts: {
        byMonth: [...byMonth.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, amount]) => ({ month, amount })),
        byCampaign: [...byCampaign.values()],
        byCourse: [...byCourse.values()],
        byReferrer: [...byReferrer.values()],
        byOfficer: [...byOfficer.values()],
      },
      pendingPayments: transactions.filter((t) => t.status === "PENDING" || t.status === "APPROVED"),
      paidPayments: payments,
    };
  },

  listAudit(limit = 100) {
    return prisma.referralCommissionAuditEvent.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        actor: { select: { id: true, fullName: true, email: true } },
        transaction: { select: { id: true, calculatedAmount: true, status: true } },
      },
    });
  },
};

export type CommissionTrigger = ReferralMilestoneTrigger;
