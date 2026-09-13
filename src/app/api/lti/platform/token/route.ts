import { apiError } from "@/lib/api";

/**
 * OAuth2 client_credentials token endpoint for LTI Advantage services
 * (Assignment & Grade Services, Names & Roles) — Moodle would call this to
 * get an access token before calling back into our APIs for those services.
 *
 * Not implemented: MCG Learn doesn't expose any LTI Advantage services yet
 * (no grade passback, no roster sync). Registered as a required URL in
 * Moodle's platform registration, but never actually invoked unless/until
 * we build one of those services.
 */
export async function POST() {
  return apiError("LTI Advantage services are not implemented yet", 501);
}
