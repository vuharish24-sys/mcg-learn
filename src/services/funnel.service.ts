import { prisma } from "@/lib/prisma";

/**
 * Fire-and-forget landing-page visit log. Never throws into the render path —
 * a tracking failure should never break the page for a visitor.
 */
export async function trackVisit(source: string) {
  try {
    await prisma.funnelEvent.create({ data: { type: "VISIT", source } });
  } catch (error) {
    console.error("Failed to record funnel visit", error);
  }
}

/**
 * Visits vs. new signups per day, for the last `days` days. Registrations are
 * derived from User.createdAt rather than a logged event — see FunnelEvent's
 * schema comment for why (the register API route fires on every login, not
 * just first-time signup, so instrumenting it would double-count).
 */
export async function getFunnelSummary(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [visits, signups] = await Promise.all([
    prisma.funnelEvent.count({ where: { type: "VISIT", createdAt: { gte: since } } }),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
  ]);

  return {
    days,
    visits,
    signups,
    conversionRate: visits > 0 ? Math.round((signups / visits) * 1000) / 10 : null,
  };
}
