import { NextResponse } from "next/server";
import { exportPlatformJwks } from "@/lib/lti-platform";

/** Public keyset Moodle uses to verify our signed launch id_tokens. Configured as our "Public keyset URL" during Moodle's tool registration. */
export async function GET() {
  const jwks = await exportPlatformJwks();
  return NextResponse.json(jwks);
}
