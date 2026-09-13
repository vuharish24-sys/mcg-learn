import { AppValidationError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export type BundleItemInput = {
  type: "LEARNING_PATH" | "LEARNING_PATH_MODULE" | "LEARNING_PATH_ITEM";
  id: string;
};

function toBundleItemCreateData(items: BundleItemInput[]) {
  return items.map((item) => ({
    learningPathId: item.type === "LEARNING_PATH" ? item.id : null,
    learningPathModuleId: item.type === "LEARNING_PATH_MODULE" ? item.id : null,
    learningPathItemId: item.type === "LEARNING_PATH_ITEM" ? item.id : null,
  }));
}

export function bundleItemLabel(item: {
  learningPath: { title: string } | null;
  learningPathModule: { title: string } | null;
  learningPathItem: { feedItem: { title: string } } | null;
}): string {
  if (item.learningPath) return item.learningPath.title;
  if (item.learningPathModule) return item.learningPathModule.title;
  if (item.learningPathItem) return item.learningPathItem.feedItem.title;
  return "Unknown item";
}

const bundleInclude = {
  items: {
    include: {
      learningPath: { select: { id: true, title: true, slug: true } },
      learningPathModule: { select: { id: true, title: true } },
      learningPathItem: { include: { feedItem: { select: { id: true, title: true } } } },
    },
  },
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
    items: BundleItemInput[];
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
        items: { create: toBundleItemCreateData(input.items) },
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
      items?: BundleItemInput[];
    },
  ) {
    const existing = await prisma.bundle.findUnique({ where: { id } });
    if (!existing) throw new AppValidationError("Bundle not found");

    return prisma.$transaction(async (tx) => {
      if (input.items) {
        await tx.bundleItem.deleteMany({ where: { bundleId: id } });
        await tx.bundleItem.createMany({
          data: toBundleItemCreateData(input.items).map((item) => ({ bundleId: id, ...item })),
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
