import { AppValidationError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type TargetType = "LEARNING_PATH" | "LEARNING_PATH_MODULE" | "LEARNING_PATH_ITEM";

function targetFk(targetType: TargetType, targetId: string) {
  return {
    learningPathId: targetType === "LEARNING_PATH" ? targetId : null,
    learningPathModuleId: targetType === "LEARNING_PATH_MODULE" ? targetId : null,
    learningPathItemId: targetType === "LEARNING_PATH_ITEM" ? targetId : null,
  };
}

const planInclude = {
  installments: { orderBy: { sequence: "asc" as const } },
  learningPath: { select: { id: true, title: true, slug: true } },
  learningPathModule: { select: { id: true, title: true } },
  learningPathItem: { include: { feedItem: { select: { id: true, title: true } } } },
} as const;

export const installmentPlanService = {
  list() {
    return prisma.installmentPlan.findMany({
      include: { ...planInclude, user: { select: { id: true, email: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  listMine(userId: string) {
    return prisma.installmentPlan.findMany({
      where: { userId },
      include: planInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  async create(input: {
    userEmail: string;
    targetType: TargetType;
    targetId: string;
    installments: { amountPaise: number; dueDate: Date }[];
  }) {
    const user = await prisma.user.findUnique({ where: { email: input.userEmail } });
    if (!user) throw new AppValidationError("No user found with that email");

    const totalAmountPaise = input.installments.reduce((sum, i) => sum + i.amountPaise, 0);

    return prisma.installmentPlan.create({
      data: {
        userId: user.id,
        totalAmountPaise,
        ...targetFk(input.targetType, input.targetId),
        installments: {
          create: input.installments.map((installment, index) => ({
            sequence: index + 1,
            amountPaise: installment.amountPaise,
            dueDate: installment.dueDate,
          })),
        },
      },
      include: planInclude,
    });
  },

  /** Admin action: revoke access immediately — contentAccessService only honors CURRENT plans. */
  async markDefaulted(id: string) {
    const plan = await prisma.installmentPlan.findUnique({ where: { id } });
    if (!plan) throw new AppValidationError("Installment plan not found");
    return prisma.installmentPlan.update({ where: { id }, data: { status: "DEFAULTED" } });
  },

  async cancel(id: string) {
    const plan = await prisma.installmentPlan.findUnique({ where: { id } });
    if (!plan) throw new AppValidationError("Installment plan not found");
    return prisma.installmentPlan.update({ where: { id }, data: { status: "CANCELLED" } });
  },
};
