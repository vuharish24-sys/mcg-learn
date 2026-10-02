import { NextResponse } from "next/server";
import { getConfig } from "@/lib/app-config";
import { appUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Signs out of MCG Learn and lands on /login — so "log out" means logged out
 * everywhere a launch may have signed the learner in (matters most on a
 * shared or public computer):
 *   - MCG Learn's own Sign out buttons come here after signing out in the
 *     browser, so the chain below runs;
 *   - WordPress/Tutor LMS's `logout_redirect` hook and the Practice Lab's
 *     sign-out both send the browser here.
 * When PRACTICE_LAB_LOGOUT_URL is set (Admin > Integrations), the browser
 * passes through the Lab's logout first, which ends any Lab session and
 * redirects straight back to /login (or just redirects when there's none).
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const loginUrl = new URL("/login", appUrl()).toString();
  const labLogoutUrl = await getConfig("PRACTICE_LAB_LOGOUT_URL");
  // The Lab only redirects back to an allowlisted https host.
  if (labLogoutUrl?.startsWith("https://") && loginUrl.startsWith("https://")) {
    const target = new URL(labLogoutUrl);
    target.searchParams.set("redirect_to", loginUrl);
    return NextResponse.redirect(target);
  }
  return NextResponse.redirect(loginUrl);
}
