import { prisma } from "@/lib/prisma";

export type ContentAccessTarget =
  | { type: "LEARNING_PATH"; id: string }
  | { type: "LEARNING_PATH_MODULE"; id: string }
  | { type: "LEARNING_PATH_ITEM"; id: string };

type PricedNode = { type: ContentAccessTarget["type"]; id: string; priceInPaise: number | null };

/**
 * Resolves the target's ancestor chain (itself, then module if any, then its
 * course), each tagged with its own priceInPaise. Access only ever needs to
 * be checked against this list, in order, plus the bundle/installment checks
 * in hasAccess below — nothing here walks back down to children, since
 * access always flows from a purchased unit down to its descendants, never
 * the other way.
 */
async function resolveChain(target: ContentAccessTarget): Promise<PricedNode[]> {
  if (target.type === "LEARNING_PATH") {
    const path = await prisma.learningPath.findUnique({
      where: { id: target.id },
      select: { id: true, priceInPaise: true },
    });
    if (!path) return [];
    return [{ type: "LEARNING_PATH", id: path.id, priceInPaise: path.priceInPaise }];
  }

  if (target.type === "LEARNING_PATH_MODULE") {
    const learningPathModule = await prisma.learningPathModule.findUnique({
      where: { id: target.id },
      select: { id: true, priceInPaise: true, learningPath: { select: { id: true, priceInPaise: true } } },
    });
    if (!learningPathModule) return [];
    return [
      { type: "LEARNING_PATH_MODULE", id: learningPathModule.id, priceInPaise: learningPathModule.priceInPaise },
      {
        type: "LEARNING_PATH",
        id: learningPathModule.learningPath.id,
        priceInPaise: learningPathModule.learningPath.priceInPaise,
      },
    ];
  }

  const item = await prisma.learningPathItem.findUnique({
    where: { id: target.id },
    select: {
      id: true,
      priceInPaise: true,
      module: { select: { id: true, priceInPaise: true } },
      learningPath: { select: { id: true, priceInPaise: true } },
    },
  });
  if (!item) return [];
  const chain: PricedNode[] = [{ type: "LEARNING_PATH_ITEM", id: item.id, priceInPaise: item.priceInPaise }];
  if (item.module) {
    chain.push({ type: "LEARNING_PATH_MODULE", id: item.module.id, priceInPaise: item.module.priceInPaise });
  }
  chain.push({ type: "LEARNING_PATH", id: item.learningPath.id, priceInPaise: item.learningPath.priceInPaise });
  return chain;
}

function nodeWhere(node: PricedNode) {
  if (node.type === "LEARNING_PATH") return { learningPathId: node.id };
  if (node.type === "LEARNING_PATH_MODULE") return { learningPathModuleId: node.id };
  return { learningPathItemId: node.id };
}

async function hasDirectOrInstallmentAccess(userId: string, node: PricedNode): Promise<boolean> {
  const purchase = await prisma.purchase.findFirst({
    where: { userId, status: "PAID", purchasableType: node.type, ...nodeWhere(node) },
    select: { id: true },
  });
  if (purchase) return true;

  // COMPLETED counts too — finishing every installment means the unit is
  // owned outright, same as a direct Purchase. Only DEFAULTED/CANCELLED
  // plans withhold access.
  const plan = await prisma.installmentPlan.findFirst({
    where: { userId, status: { in: ["CURRENT", "COMPLETED"] }, ...nodeWhere(node) },
    select: { id: true },
  });
  return Boolean(plan);
}

async function hasBundleAccess(userId: string, pricedNodes: PricedNode[]): Promise<boolean> {
  if (pricedNodes.length === 0) return false;

  const bundlePurchases = await prisma.purchase.findMany({
    where: { userId, status: "PAID", purchasableType: "BUNDLE" },
    select: { bundleId: true },
  });
  const bundleIds = bundlePurchases.map((p) => p.bundleId).filter((id): id is string => Boolean(id));
  if (bundleIds.length === 0) return false;

  const match = await prisma.bundleItem.findFirst({
    where: {
      bundleId: { in: bundleIds },
      OR: pricedNodes.map(nodeWhere),
    },
    select: { id: true },
  });
  return Boolean(match);
}

export const contentAccessService = {
  /**
   * Does this user have access to this unit right now? A unit with no price
   * anywhere in its chain (itself, its module, its course) is open to any
   * logged-in learner — there's nothing to have bought. Otherwise, access is
   * granted by a PAID Purchase or CURRENT InstallmentPlan on the unit itself
   * or any priced ancestor, or by owning a Bundle that includes the unit or
   * any priced ancestor.
   */
  async hasAccess(userId: string, target: ContentAccessTarget): Promise<boolean> {
    const chain = await resolveChain(target);
    if (chain.length === 0) return false;

    const priced = chain.filter((node) => node.priceInPaise != null);
    if (priced.length === 0) return true;

    for (const node of priced) {
      if (await hasDirectOrInstallmentAccess(userId, node)) return true;
    }
    return hasBundleAccess(userId, priced);
  },

  /** Convenience wrapper for the common "does this learner have this specific lesson, within this path" check. */
  async hasItemAccess(userId: string, learningPathId: string, feedItemId: string): Promise<boolean> {
    const item = await prisma.learningPathItem.findUnique({
      where: { learningPathId_feedItemId: { learningPathId, feedItemId } },
      select: { id: true },
    });
    if (!item) return contentAccessService.hasAccess(userId, { type: "LEARNING_PATH", id: learningPathId });
    return contentAccessService.hasAccess(userId, { type: "LEARNING_PATH_ITEM", id: item.id });
  },
};
