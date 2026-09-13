import { AppValidationError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const learningPathModuleService = {
  async create(input: {
    learningPathId: string;
    title: string;
    description?: string | null;
    sortOrder?: number;
    priceInPaise?: number | null;
  }) {
    const path = await prisma.learningPath.findUnique({ where: { id: input.learningPathId } });
    if (!path) throw new AppValidationError("Learning path not found");

    return prisma.learningPathModule.create({
      data: {
        learningPathId: input.learningPathId,
        title: input.title,
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? 0,
        priceInPaise: input.priceInPaise ?? null,
      },
    });
  },

  async update(
    id: string,
    input: { title?: string; description?: string | null; sortOrder?: number; priceInPaise?: number | null },
  ) {
    const existing = await prisma.learningPathModule.findUnique({ where: { id } });
    if (!existing) throw new AppValidationError("Module not found");

    return prisma.learningPathModule.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.priceInPaise !== undefined ? { priceInPaise: input.priceInPaise } : {}),
      },
    });
  },

  async delete(id: string) {
    const existing = await prisma.learningPathModule.findUnique({ where: { id } });
    if (!existing) throw new AppValidationError("Module not found");
    await prisma.learningPathModule.delete({ where: { id } });
  },
};
