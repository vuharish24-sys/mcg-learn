"use client";

import { useEffect } from "react";

export function AdImpressionTracker({ advertisementIds }: { advertisementIds: string[] }) {
  useEffect(() => {
    if (advertisementIds.length === 0) return;
    const key = `mcg_ad_impr_${[...advertisementIds].sort().join("|")}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
    void fetch("/api/v1/advertisements/impressions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: advertisementIds }),
    });
  }, [advertisementIds]);

  return null;
}
