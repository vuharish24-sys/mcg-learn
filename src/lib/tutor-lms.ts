import { randomUUID } from "node:crypto";

/**
 * Client for the self-hosted WordPress + Tutor LMS instance. Two separate
 * auth mechanisms, deliberately:
 *   - WordPress's own core Users API (Application Password / Basic Auth) —
 *     this direction supports writes fine, only Tutor LMS's own REST API
 *     routes are Read-only on the free tier.
 *   - A small custom plugin (`mcglearn/v1` namespace) for enroll/unenroll/
 *     auto-login, authenticated by a single shared secret we generate
 *     ourselves — not WP Application Passwords, not Tutor's own key/secret
 *     system. See docs/WORDPRESS_MIGRATION.md for why both of those don't
 *     work for this.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const wordpressConfig = {
  get baseUrl() {
    return requireEnv("WORDPRESS_BASE_URL").replace(/\/$/, "");
  },
  get appUsername() {
    return requireEnv("WORDPRESS_APP_USERNAME");
  },
  get appPassword() {
    return requireEnv("WORDPRESS_APP_PASSWORD");
  },
  /** Shared secret for the custom mcglearn/v1 plugin routes — see file comment. */
  get pluginSecret() {
    return requireEnv("MCGLEARN_WP_PLUGIN_SECRET");
  },
};

function wpBasicAuthHeader(): string {
  const token = Buffer.from(`${wordpressConfig.appUsername}:${wordpressConfig.appPassword}`).toString("base64");
  return `Basic ${token}`;
}

type WpUser = { id: number; email?: string };

/** Finds an existing WordPress user by email via WP's core Users API, or creates one. Returns the WP user id. */
export async function findOrCreateWpUser(email: string, fullName: string): Promise<number> {
  const base = wordpressConfig.baseUrl;
  const auth = wpBasicAuthHeader();

  const searchRes = await fetch(`${base}/wp-json/wp/v2/users?search=${encodeURIComponent(email)}&context=edit`, {
    headers: { Authorization: auth },
  });
  if (!searchRes.ok) throw new Error(`WordPress user search failed: ${searchRes.status}`);
  const found = (await searchRes.json()) as WpUser[];
  const exact = found.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (exact) return exact.id;

  const createRes = await fetch(`${base}/wp-json/wp/v2/users`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      // Login is never used directly — access is only ever via the
      // auto-login-token redirect — so a random username/password is fine.
      username: `${email.split("@")[0]}-${randomUUID().slice(0, 8)}`,
      email,
      name: fullName,
      password: randomUUID(),
      roles: ["subscriber"],
    }),
  });
  if (!createRes.ok) throw new Error(`WordPress user creation failed: ${createRes.status}`);
  const created = (await createRes.json()) as WpUser;
  return created.id;
}

async function callPlugin(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${wordpressConfig.baseUrl}/wp-json/mcglearn/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-MCGLearn-Key": wordpressConfig.pluginSecret,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`WordPress plugin call to ${path} failed: ${res.status}`);
  return res.json();
}

export function enrollWpUser(wpUserId: number, tutorCourseId: number): Promise<unknown> {
  return callPlugin("enroll", { user_id: wpUserId, course_id: tutorCourseId });
}

export function unenrollWpUser(wpUserId: number, tutorCourseId: number): Promise<unknown> {
  return callPlugin("unenroll", { user_id: wpUserId, course_id: tutorCourseId });
}

/**
 * Returns a one-time login URL that drops the browser straight into
 * WordPress, already authenticated. `returnUrl`, if given, is handed to the
 * plugin so it can show a "Back to MCG Learn" link on every page for the
 * rest of that browser session — otherwise a student has no way back short
 * of the browser's own Back button.
 */
export async function generateAutoLoginUrl(
  wpUserId: number,
  tutorCourseId?: number,
  returnUrl?: string,
): Promise<string> {
  const result = await callPlugin("auto-login-token", {
    user_id: wpUserId,
    ...(tutorCourseId ? { course_id: tutorCourseId } : {}),
    ...(returnUrl ? { return_url: returnUrl } : {}),
  });
  if (typeof result.launch_url !== "string") throw new Error("WordPress plugin did not return a launch_url");
  return result.launch_url;
}
