/**
 * Server-side quiz pass threshold for Learning Paths.
 * Do not trust client-provided pass percentages.
 *
 * Order: path item override → path default → 60
 */
export function resolveQuizPassPercentage(options: {
  itemPassPercentage?: number | null;
  pathQuizPassPercentage?: number | null;
}): number {
  if (
    typeof options.itemPassPercentage === "number" &&
    Number.isFinite(options.itemPassPercentage)
  ) {
    return Math.min(100, Math.max(0, Math.round(options.itemPassPercentage)));
  }
  if (
    typeof options.pathQuizPassPercentage === "number" &&
    Number.isFinite(options.pathQuizPassPercentage)
  ) {
    return Math.min(100, Math.max(0, Math.round(options.pathQuizPassPercentage)));
  }
  return 60;
}
