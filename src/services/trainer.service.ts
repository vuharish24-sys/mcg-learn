import { TrainerStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const trainerService = {
  list(search?: string, status?: string) {
    return prisma.trainer.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" as const } },
                { specializations: { has: search } },
              ],
            }
          : {}),
        ...(status ? { status: status as TrainerStatus } : {}),
      },
      orderBy: [{ status: "asc" }, { fullName: "asc" }],
      take: 100,
    });
  },
  create(data: Prisma.TrainerUncheckedCreateInput) {
    return prisma.trainer.create({ data });
  },
  update(id: string, data: Prisma.TrainerUncheckedUpdateInput) {
    return prisma.trainer.update({ where: { id }, data });
  },
};
