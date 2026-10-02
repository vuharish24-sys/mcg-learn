"use client";

import { LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {

  return (
    <Button
      variant="ghost"
      className="w-full justify-start text-slate-600 dark:text-slate-300"
      onClick={async () => {
        await createSupabaseBrowserClient().auth.signOut();
        // Full navigation: the server route may chain through the Practice Lab's logout.
        window.location.assign("/api/v1/auth/logout");
      }}
    >
      <LogOut className="size-4" /> Sign out
    </Button>
  );
}
