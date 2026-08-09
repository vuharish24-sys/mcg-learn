import type { Config } from "@netlify/functions";

// Thin wrapper only: no local imports, so this never depends on the Next.js
// build's module/path-alias resolution. It just calls the app's own
// authenticated maintenance endpoint.
const publishScheduledFeed = async () => {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.CRON_SECRET;

  if (!siteUrl || !secret) {
    console.error("publish-scheduled-feed: missing URL or CRON_SECRET env var, skipping run");
    return new Response("Missing configuration", { status: 500 });
  }

  const response = await fetch(`${siteUrl}/api/v1/feed/publish-scheduled`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });

  const body = await response.text();
  if (!response.ok) {
    console.error(`publish-scheduled-feed: job failed (${response.status}): ${body}`);
    return new Response(body, { status: response.status });
  }

  console.log(`publish-scheduled-feed: ${body}`);
  return new Response(body, { status: 200 });
};

export default publishScheduledFeed;

// Hourly - scheduled blog/social content benefits from finer granularity than
// the once-daily milestone-expiry job.
export const config: Config = {
  schedule: "0 * * * *",
};
