import type { Config } from "@netlify/functions";

// Thin wrapper only: no local imports, so this never depends on the Next.js
// build's module/path-alias resolution. It just calls the app's own
// authenticated maintenance endpoint.
const expireReferralMilestones = async () => {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.CRON_SECRET;

  if (!siteUrl || !secret) {
    console.error("expire-referral-milestones: missing URL or CRON_SECRET env var, skipping run");
    return new Response("Missing configuration", { status: 500 });
  }

  const response = await fetch(`${siteUrl}/api/v1/referral-milestones/expire`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });

  const body = await response.text();
  if (!response.ok) {
    console.error(`expire-referral-milestones: job failed (${response.status}): ${body}`);
    return new Response(body, { status: response.status });
  }

  console.log(`expire-referral-milestones: ${body}`);
  return new Response(body, { status: 200 });
};

export default expireReferralMilestones;

export const config: Config = {
  schedule: "0 3 * * *",
};
