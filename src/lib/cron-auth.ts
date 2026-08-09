import { timingSafeEqual } from "crypto";
import { cronSecret } from "@/lib/env";

/** True if the request carries a valid `Authorization: Bearer <CRON_SECRET>` header. */
export function isValidCronSecret(request: Request) {
  const secret = cronSecret();
  if (!secret) return false;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
