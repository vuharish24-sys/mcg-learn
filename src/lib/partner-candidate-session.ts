import { cookies } from "next/headers";
import { partnerCandidateService, isCandidateAccessValid } from "@/services/partner-candidate.service";

export function partnerCandidateCookieName(partnerId: string) {
  return `mcg_pc_${partnerId}`;
}

export const PARTNER_CANDIDATE_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

/** Server-only. Reads the per-partner session cookie and resolves it to a candidate + access validity. */
export async function getPartnerCandidateSession(partnerId: string) {
  const store = await cookies();
  const token = store.get(partnerCandidateCookieName(partnerId))?.value;
  if (!token) return null;

  const candidate = await partnerCandidateService.getBySessionToken(token);
  if (!candidate || candidate.partnerId !== partnerId) return null;

  return { candidate, valid: isCandidateAccessValid(candidate) };
}
