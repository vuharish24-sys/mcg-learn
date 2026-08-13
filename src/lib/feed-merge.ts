const AD_TYPES = new Set(["ADVERTISEMENT", "SPONSORED"]);

/**
 * Spreads out ADVERTISEMENT/SPONSORED items so several high-priority ads
 * can't cluster together — keeps at least `minGap` non-ad items between two
 * ads wherever the list is long enough to allow it. Held-back ads keep their
 * relative order and get appended at the end if the list runs out of room.
 */
export function spaceOutAds<T extends { type: string }>(items: T[], minGap = 4): T[] {
  const result: T[] = [];
  const held: T[] = [];
  let sinceLastAd = minGap;

  for (const item of items) {
    if (AD_TYPES.has(item.type)) {
      held.push(item);
      continue;
    }
    result.push(item);
    sinceLastAd += 1;
    if (held.length > 0 && sinceLastAd >= minGap) {
      result.push(held.shift()!);
      sinceLastAd = 0;
    }
  }
  result.push(...held);
  return result;
}

export type MergedFeedCard<TFeedItem, TPath> =
  | { kind: "feed"; item: TFeedItem }
  | { kind: "path"; path: TPath };

/** Splices path cards into the feed every `interval` positions; leftovers append at the end. */
export function interleavePaths<TFeedItem, TPath>(
  feedItems: TFeedItem[],
  pathCards: TPath[],
  interval = 5,
): MergedFeedCard<TFeedItem, TPath>[] {
  const merged: MergedFeedCard<TFeedItem, TPath>[] = [];
  let pathIndex = 0;

  feedItems.forEach((item, i) => {
    merged.push({ kind: "feed", item });
    if ((i + 1) % interval === 0 && pathIndex < pathCards.length) {
      merged.push({ kind: "path", path: pathCards[pathIndex] });
      pathIndex += 1;
    }
  });

  while (pathIndex < pathCards.length) {
    merged.push({ kind: "path", path: pathCards[pathIndex] });
    pathIndex += 1;
  }

  return merged;
}

/**
 * Splices extra wrapped cards into an already-built card array every
 * `interval` positions; leftovers append at the end. Generic over the base
 * array's element type so it composes on top of interleavePaths (or plain
 * feed items) without needing its own kind union — used to sprinkle
 * standalone Benefit promo cards into the merged feed.
 */
export function interleaveExtra<TBase, TExtra, TWrapped>(
  base: TBase[],
  extras: TExtra[],
  wrap: (extra: TExtra) => TWrapped,
  interval = 6,
): (TBase | TWrapped)[] {
  const merged: (TBase | TWrapped)[] = [];
  let extraIndex = 0;

  base.forEach((item, i) => {
    merged.push(item);
    if ((i + 1) % interval === 0 && extraIndex < extras.length) {
      merged.push(wrap(extras[extraIndex]));
      extraIndex += 1;
    }
  });

  while (extraIndex < extras.length) {
    merged.push(wrap(extras[extraIndex]));
    extraIndex += 1;
  }

  return merged;
}
