const STORAGE_KEY = "mcg-learn:visited-nav-hrefs";

/** Per-browser "have they seen this section yet" tracking — cosmetic only, never a source of real progress data. */
export function getVisitedHrefs(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markHrefVisited(href: string) {
  if (typeof window === "undefined") return;
  try {
    const current = getVisitedHrefs();
    if (current.has(href)) return;
    current.add(href);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]));
  } catch {
    // Private browsing / storage blocked — the badge just won't clear, not worth surfacing an error for.
  }
}
