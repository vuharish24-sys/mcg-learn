import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getConfig, requireConfig } from "@/lib/app-config";

/**
 * Client for the Practice Lab institute API (lab.medicalcodingglobal.com) —
 * a separate platform from the WordPress/Tutor LMS site, used for exercises,
 * exams and mock exams. Auth is HMAC-SHA256 over the request, not a shared
 * secret header or WP-style Basic Auth: every call carries a key id,
 * timestamp, nonce and a signature covering the method, path+query,
 * timestamp, nonce and the raw body hash. See PRACTICE_LAB_API docs for the
 * exact scheme.
 */

async function practiceLabConfig() {
  const [baseUrl, apiKeyId, apiSecret] = await Promise.all([
    requireConfig("PRACTICE_LAB_BASE_URL"),
    requireConfig("PRACTICE_LAB_API_KEY_ID"),
    requireConfig("PRACTICE_LAB_API_SECRET"),
  ]);
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKeyId, apiSecret };
}

function sign(secret: string, method: string, requestUri: string, timestamp: string, nonce: string, bodyHash: string): string {
  const message = `${method}\n${requestUri}\n${timestamp}\n${nonce}\n${bodyHash}`;
  return createHmac("sha256", secret).update(message).digest("hex");
}

export class PracticeLabApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "PracticeLabApiError";
  }
}

async function callApi<T>(method: "GET" | "POST", requestUri: string, body?: unknown): Promise<T> {
  const config = await practiceLabConfig();
  const rawBody = body === undefined ? "" : JSON.stringify(body);
  const bodyHash = createHash("sha256").update(rawBody).digest("hex");
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString("hex");
  const url = new URL(`${config.baseUrl}${requestUri}`);
  // The Lab signs the full request URI as its server sees it, including the
  // /api/v1 prefix from the base URL, not just the part after it.
  const signature = sign(config.apiSecret, method, `${url.pathname}${url.search}`, timestamp, nonce, bodyHash);

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": config.apiKeyId,
      "X-Api-Timestamp": timestamp,
      "X-Api-Nonce": nonce,
      "X-Api-Signature": signature,
    },
    body: body === undefined ? undefined : rawBody,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new PracticeLabApiError(`Practice Lab API ${method} ${requestUri} failed (${response.status}): ${text}`, response.status);
  }
  return response.json() as Promise<T>;
}

/**
 * `ref` (max 64 chars) makes a grant idempotent: a repeat enrolment with the
 * same ref returns the existing entitlement instead of issuing another, and
 * the Lab can revoke by it. We send our Purchase id.
 */
export type PracticeLabGrant = (
  | { kind: "exam"; exam: string }
  | { kind: "program_practice"; program: string }
) & { ref?: string };

/**
 * `redirect_to` is a path inside the Lab where the learner lands once the
 * hand-off signs them in — it must start with "/"; an absolute URL is
 * silently dropped. "/launch/exam/<id>" and "/launch/practice/<code>" open
 * the attempt directly (falling back to /dashboard with the reason when the
 * learner can't start it). The link is single use and `ttl_sec` is clamped to
 * 60..86400.
 */
type Handoff = {
  redirect_to?: `/${string}`;
  ttl_sec?: number;
  /**
   * Absolute https URL back into MCG Learn, allowlisted per institute on the
   * Lab. The Lab keeps it for that session only and uses it for a "Back to
   * MCG Learn" link, for where a sign-out lands (our logout route), and for
   * where an idle-expired session goes.
   */
  return_to?: string;
};

type EnrolmentResponse = {
  learner: unknown;
  entitlements: unknown;
  handoff_url?: string;
};

/**
 * POST /institute/enrolments — finds or creates the learner (matched by
 * external_ref, then email, then phone) and, when `grants` is given, adds
 * those entitlements. The learner match is idempotent; a grant is only
 * idempotent when it carries a `ref`. Returns 409 when the email or phone
 * belongs to a Lab admin or staff account — nothing is granted then. Calling it with no grants (just to request a
 * fresh `handoff`) doesn't issue anything.
 */
export function enrolLearner(
  learner: { external_ref: string; name: string; email?: string; phone?: string },
  grants?: PracticeLabGrant[],
  handoff?: Handoff,
): Promise<EnrolmentResponse> {
  return callApi<EnrolmentResponse>("POST", "/institute/enrolments", {
    learner,
    ...(grants ? { grants } : {}),
    ...(handoff ? { handoff } : {}),
  });
}

/** One attempt as the Lab's institute API and attempt.completed webhook describe it. */
export type PracticeLabAttempt = {
  id: string;
  /** Null for program drills. `id` is the same exam public id we grant. */
  exam: { id: string; name: string } | null;
  program: string;
  mode: string;
  /** "graded" is the only finished-and-scored state. */
  status?: "in_progress" | "submitted" | "graded" | "abandoned" | "expired";
  counted_pct: number | null;
  /** Null before grading and for modes not judged against a pass mark (e.g. drills). */
  passed: boolean | null;
};

/** GET /institute/attempts for one learner (scope attempts.read), newest first, up to 200. */
export async function listLearnerAttempts(externalRef: string, filter: { exam?: string } = {}) {
  const query = new URLSearchParams({ learner: externalRef, per_page: "200" });
  if (filter.exam) query.set("exam", filter.exam);
  const result = await callApi<{ data: PracticeLabAttempt[] }>("GET", `/institute/attempts?${query.toString()}`);
  return result.data;
}

/**
 * Verifies an incoming Lab webhook: X-Lab-Signature = hex HMAC-SHA256(secret,
 * timestamp + "." + raw body), with the timestamp within five minutes.
 */
export async function verifyPracticeLabWebhook(rawBody: string, timestamp: string | null, signature: string | null) {
  const secret = await getConfig("PRACTICE_LAB_WEBHOOK_SECRET");
  if (!secret || !timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex"));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * Admin > Integrations "Test connection": a signed read of a learner that
 * can't exist. 404 means the key, secret and signature were all accepted.
 */
export async function probePracticeLab(): Promise<{ ok: boolean; message: string }> {
  try {
    await callApi("GET", "/institute/learners/mcglearn-connection-test");
    return { ok: true, message: "Connected." };
  } catch (error) {
    if (error instanceof PracticeLabApiError) {
      if (error.status === 404) return { ok: true, message: "Connected — the Lab accepted the key and signature." };
      if (error.status === 401) return { ok: false, message: "Rejected (401): wrong key ID or secret, or the server clock is off." };
      if (error.status === 403) return { ok: false, message: "Rejected (403): the key is missing the learners.read scope." };
      return { ok: false, message: `The Lab returned ${error.status}.` };
    }
    return { ok: false, message: error instanceof Error ? error.message : "Unable to reach the Lab." };
  }
}
