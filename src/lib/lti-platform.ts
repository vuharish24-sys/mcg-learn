/**
 * MCG Learn as an LTI 1.3 *Platform*, launching users into Moodle (the
 * *Tool*) — the reverse of Moodle's usual role. Moodle supports this via its
 * "Publish as LTI tool" feature (per-course), which is what generates the
 * client_id / deployment_id / login-initiation URL / redirect URI this file
 * expects in env vars. See docs/MOODLE_SELF_HOSTING.md Phase 5.
 *
 * Flow (IMS "third party initiated login"):
 *   1. `/api/v1/moodle-courses/[feedItemId]/launch` checks the learner has
 *      paid, then redirects the browser to Moodle's login-init URL.
 *   2. Moodle redirects the browser back to our `authorizationEndpoint`
 *      (`/api/lti/platform/authorize`) with its own `state`/`nonce`.
 *   3. We re-check access, mint a signed id_token with the LTI launch
 *      claims, and auto-submit it back to Moodle's `redirect_uri`.
 *   4. Moodle verifies the signature against our JWKS endpoint and starts
 *      the actual Moodle session for that user.
 *
 * Anti-replay (`state`/`nonce`) is Moodle's responsibility as the relying
 * party here, not ours — we only ever echo back what it sent us.
 */
import { SignJWT, importPKCS8, importSPKI, exportJWK, type JWK } from "jose";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const ltiPlatformConfig = {
  get issuer() {
    return requireEnv("LTI_PLATFORM_ISSUER");
  },
  get keyId() {
    return requireEnv("LTI_PLATFORM_KEY_ID");
  },
  get privateKeyPem() {
    return requireEnv("LTI_PLATFORM_PRIVATE_KEY_PEM").replace(/\\n/g, "\n");
  },
  get publicKeyPem() {
    return requireEnv("LTI_PLATFORM_PUBLIC_KEY_PEM").replace(/\\n/g, "\n");
  },
  /** Moodle's client_id for us, issued when the admin registers MCG Learn as a tool. */
  get moodleClientId() {
    return requireEnv("MOODLE_LTI_CLIENT_ID");
  },
  get moodleDeploymentId() {
    return requireEnv("MOODLE_LTI_DEPLOYMENT_ID");
  },
  /** Moodle's OIDC third-party-login-initiation URL, from its tool registration screen. */
  get moodleLoginInitUrl() {
    return requireEnv("MOODLE_LTI_LOGIN_INIT_URL");
  },
  /** The redirect_uri Moodle is registered to use — validated against what Moodle sends us. */
  get moodleRedirectUri() {
    return requireEnv("MOODLE_LTI_REDIRECT_URI");
  },
};

export async function exportPlatformJwks(): Promise<{ keys: JWK[] }> {
  const publicKey = await importSPKI(ltiPlatformConfig.publicKeyPem, "RS256");
  const jwk = await exportJWK(publicKey);
  return {
    keys: [{ ...jwk, kid: ltiPlatformConfig.keyId, use: "sig", alg: "RS256" }],
  };
}

/** Parses Moodle's "Custom properties" format (e.g. "id=76205b0e-...\nfoo=bar") into a claim object. */
export function parseLtiCustomParams(raw: string | null | undefined): Record<string, string> | undefined {
  if (!raw) return undefined;
  const entries = raw
    .split(/[\n&]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("=").map((s) => s.trim()) as [string, string])
    .filter(([key, value]) => key && value !== undefined);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export async function signLaunchIdToken(claims: {
  subject: string;
  nonce: string;
  targetLinkUri: string;
  resourceLinkId: string;
  resourceLinkTitle: string;
  fullName: string;
  email: string;
  roles: string[];
  /** Moodle's per-resource "Custom properties" (see parseLtiCustomParams) — required for enrol_lti to know which published resource this launch is for, since target_link_uri itself must stay query-string-free. */
  custom?: Record<string, string>;
}): Promise<string> {
  const privateKey = await importPKCS8(ltiPlatformConfig.privateKeyPem, "RS256");
  const [givenName, ...rest] = claims.fullName.trim().split(/\s+/);

  return new SignJWT({
    nonce: claims.nonce,
    name: claims.fullName,
    given_name: givenName ?? claims.fullName,
    family_name: rest.join(" ") || undefined,
    email: claims.email,
    "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiResourceLinkRequest",
    "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
    "https://purl.imsglobal.org/spec/lti/claim/deployment_id": ltiPlatformConfig.moodleDeploymentId,
    "https://purl.imsglobal.org/spec/lti/claim/target_link_uri": claims.targetLinkUri,
    "https://purl.imsglobal.org/spec/lti/claim/resource_link": {
      id: claims.resourceLinkId,
      title: claims.resourceLinkTitle,
    },
    "https://purl.imsglobal.org/spec/lti/claim/roles": claims.roles,
    ...(claims.custom ? { "https://purl.imsglobal.org/spec/lti/claim/custom": claims.custom } : {}),
  })
    .setProtectedHeader({ alg: "RS256", kid: ltiPlatformConfig.keyId, typ: "JWT" })
    .setIssuer(ltiPlatformConfig.issuer)
    .setAudience(ltiPlatformConfig.moodleClientId)
    .setSubject(claims.subject)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

/** LIS vocabulary role URIs — see https://www.imsglobal.org/spec/lti/v1p3#role-vocabularies */
export const LTI_ROLE = {
  LEARNER: "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner",
  INSTRUCTOR: "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor",
} as const;
