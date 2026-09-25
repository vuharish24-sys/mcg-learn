import { NextResponse } from "next/server";
import { appUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Logout landing page for a WordPress/Tutor LMS session that came from an
 * MCG-Learn launch — the mu-plugin's `logout_redirect` hook sends the
 * browser here when the student logs out of WordPress, so "log out" means
 * logged out of both, not just the LMS side (matters most on a shared or
 * public computer).
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", appUrl()));
}
