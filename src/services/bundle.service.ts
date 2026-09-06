import { AppValidationError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const bundleInclude = {
  paths: { include: { learningPath: { select: { id: true, title: true, slug: true } } } },
} as const;

export const bundleService = {
  list() {
    return prisma.bundle.findMany({ include: bundleInclude, orderBy: { createdAt: "desc" } });
  },

  listActive() {
    return prisma.bundle.findMany({
      where: { isActive: true },
      include: bundleInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  findBySlug(slug: string) {
    return prisma.bundle.findUnique({ where: { slug }, include: bundleInclude });
  },

  async create(input: {
    title: string;
    slug: string;
    description: string;
    priceInPaise: number;
    isActive: boolean;
    learningPathIds: string[];
  }) {
    const existing = await prisma.bundle.findUnique({ where: { slug: input.slug } });
    if (existing) throw new AppValidationError("A bundle with this slug already exists");

    return prisma.bundle.create({
      data: {
        title: input.title,
        slug: input.slug,
        description: input.description,
        priceInPaise: input.priceInPaise,
        isActive: input.isActive,
        paths: { create: input.learningPathIds.map((learningPathId) => ({ learningPathId })) },
      },
      include: bundleInclude,
    });
  },

  async update(
    id: string,
    input: {
      title?: string;
      description?: string;
      priceInPaise?: number;
      isActive?: boolean;
      learningPathIds?: string[];
    },
  ) {
    const existing = await prisma.bundle.findUnique({ where: { id } });
    if (!existing) throw new AppValidationError("Bundle not found");

    return prisma.$transaction(async (tx) => {
      if (input.learningPathIds) {
        await tx.bundlePath.deleteMany({ where: { bundleId: id } });
        await tx.bundlePath.createMany({
          data: input.learningPathIds.map((learningPathId) => ({ bundleId: id, learningPathId })),
        });
      }
      return tx.bundle.update({
        where: { id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.priceInPaise !== undefined ? { priceInPaise: input.priceInPaise } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
        include: bundleInclude,
      });
    });
  },

  async delete(id: string) {
    const existing = await prisma.bundle.findUnique({ where: { id } });
    if (!existing) throw new AppValidationError("Bundle not found");
    await prisma.bundle.delete({ where: { id } });
  },
};
