import { prisma } from "@/lib/prisma";
import { AppValidationError } from "@/lib/api";
import { partnerService } from "@/services/partner.service";

export const partnerSubscriptionService = {
  listAll() {
    return prisma.partnerSubscription.findMany({
      include: { requestingPartner: true, targetPartner: true },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Approved target partner ids whose exclusive board `partnerId` may also see. */
  async getApprovedTargetIds(partnerId: string) {
    const rows = await prisma.partnerSubscription.findMany({
      where: { requestingPartnerId: partnerId, status: "APPROVED" },
      select: { targetPartnerId: true },
    });
    return rows.map((row) => row.targetPartnerId);
  },

  async requestSubscription(input: {
    requestingAccessCode: string;
    targetPartnerId: string;
    contactName?: string;
    contactEmail?: string | null;
  }) {
    const requestingPartner = await partnerService.getByAccessCode(input.requestingAccessCode);
    if (!requestingPartner) throw new AppValidationError("Partner link not recognized");

    if (requestingPartner.id === input.targetPartnerId) {
      throw new AppValidationError("A partner cannot subscribe to its own board");
    }

    const targetPartner = await prisma.partner.findUnique({ where: { id: input.targetPartnerId } });
    if (!targetPartner) throw new AppValidationError("Target partner not found");

    const existing = await prisma.partnerSubscription.findUnique({
      where: {
        requestingPartnerId_targetPartnerId: {
          requestingPartnerId: requestingPartner.id,
          targetPartnerId: input.targetPartnerId,
        },
      },
    });
    if (existing) return existing;

    return prisma.partnerSubscription.create({
      data: {
        requestingPartnerId: requestingPartner.id,
        targetPartnerId: input.targetPartnerId,
        contactName: input.contactName || null,
        contactEmail: input.contactEmail || null,
      },
    });
  },

  setStatus(id: string, status: "APPROVED" | "REJECTED") {
    return prisma.partnerSubscription.update({ where: { id }, data: { status } });
  },
};
