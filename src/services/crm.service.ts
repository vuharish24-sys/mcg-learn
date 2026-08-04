import { LeadStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const crmService = {
  list(search?: string, status?: string, officerId?: string) {
    const where: Prisma.LeadWhereInput = {
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
            ],
          }
        : {}),
      ...(status ? { status: status as LeadStatus } : {}),
      ...(officerId ? { assignedOfficerId: officerId } : {}),
    };
    return prisma.lead.findMany({
      where,
      include: { assignedOfficer: { select: { id: true, fullName: true } }, _count: { select: { notes: true } } },
      orderBy: [{ followUpAt: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
  },
  getById(id: string) {
    return prisma.lead.findUnique({
      where: { id },
      include: {
        assignedOfficer: { select: { id: true, fullName: true, email: true } },
        notes: {
          include: { author: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  },
  create(data: Prisma.LeadUncheckedCreateInput) {
    return prisma.lead.create({ data });
  },
  update(id: string, data: Prisma.LeadUncheckedUpdateInput) {
    return prisma.lead.update({ where: { id }, data });
  },
  createNote(leadId: string, authorId: string, body: string) {
    return prisma.leadNote.create({
      data: { leadId, authorId, body },
      include: { author: { select: { id: true, fullName: true } } },
    });
  },
  updateNote(id: string, body: string) {
    return prisma.leadNote.update({
      where: { id },
      data: { body },
      include: { author: { select: { id: true, fullName: true } } },
    });
  },

  /**
   * Best-effort handoff signal: when a learner earns a certificate, flag the
   * matching CRM lead (if any) so Career Officers know they're ready for the
   * paid LMS conversation, instead of that only surfacing if someone happens
   * to notice the certificate separately. Matches by email since leads aren't
   * otherwise linked to a User account. No-op if there's no open lead to flag.
   */
  async flagLearnerCertified(email: string, courseName: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return null;

    const lead = await prisma.lead.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" }, status: { not: "CLOSED" } },
      orderBy: { updatedAt: "desc" },
    });
    if (!lead) return null;

    const systemAuthor = await prisma.user.findFirst({
      where: { role: { key: "ADMIN" } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!systemAuthor) return null;

    const [note] = await prisma.$transaction([
      prisma.leadNote.create({
        data: {
          leadId: lead.id,
          authorId: systemAuthor.id,
          body: `🎓 Automated: this learner earned a certificate for "${courseName}". Ready for a paid LMS enrollment conversation.`,
        },
      }),
      ...(["NEW", "CONTACTED", "INTERESTED", "FOLLOW_UP"].includes(lead.status)
        ? [prisma.lead.update({ where: { id: lead.id }, data: { status: LeadStatus.ADMITTED } })]
        : []),
    ]);
    return note;
  },
};
