import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Matches middleware's isProtectedPath — these all redirect to /login for
      // anonymous crawlers anyway, but excluding them keeps the crawl budget on
      // pages that actually matter for discovery.
      disallow: [
        "/dashboard",
        "/profile",
        "/feed",
        "/learning-paths",
        "/my-learning",
        "/my-achievements",
        "/crm",
        "/trainers",
        "/referrals",
        "/referral-campaigns",
        "/certificates",
        "/advertisements",
        "/admin",
        "/api/",
      ],
    },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
