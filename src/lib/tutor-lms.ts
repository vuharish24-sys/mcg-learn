import { randomUUID } from "node:crypto";
import { requireConfig } from "@/lib/app-config";

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
async function wordpressConfig() {
  const [baseUrl, appUsername, appPassword] = await Promise.all([
    requireConfig("WORDPRESS_BASE_URL"),
    requireConfig("WORDPRESS_APP_USERNAME"),
    requireConfig("WORDPRESS_APP_PASSWORD"),
  ]);
  return { baseUrl: baseUrl.replace(/\/$/, ""), basicAuth: `Basic ${Buffer.from(`${appUsername}:${appPassword}`).toString("base64")}` };
}

type WpUser = { id: number; email?: string };

/** Finds an existing WordPress user by email via WP's core Users API, or creates one. Returns the WP user id. */
export async function findOrCreateWpUser(email: string, fullName: string): Promise<number> {
  const { baseUrl: base, basicAuth: auth } = await wordpressConfig();

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
  const [{ baseUrl }, pluginSecret] = await Promise.all([wordpressConfig(), requireConfig("MCGLEARN_WP_PLUGIN_SECRET")]);
  const res = await fetch(`${baseUrl}/wp-json/mcglearn/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-MCGLearn-Key": pluginSecret,
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

/**
 * Admin > Integrations "Test connection": reads the Application Password
 * account's own profile. Doesn't exercise the plugin's shared secret — the
 * plugin has no read-only route to check it against.
 */
export async function probeWordPress(): Promise<{ ok: boolean; message: string }> {
  try {
    const { baseUrl, basicAuth } = await wordpressConfig();
    const res = await fetch(`${baseUrl}/wp-json/wp/v2/users/me?context=edit`, { headers: { Authorization: basicAuth } });
    if (res.ok) {
      const me = (await res.json()) as { slug?: string };
      return { ok: true, message: `Connected as "${me.slug ?? "unknown"}". (The plugin shared secret isn't checked by this test.)` };
    }
    if (res.status === 401) return { ok: false, message: "Rejected (401): wrong Application Password username or password." };
    return { ok: false, message: `WordPress returned ${res.status}.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Unable to reach WordPress." };
  }
}
