"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getVisitedHrefs, markHrefVisited } from "@/lib/visited-nav";
import {
  Award,
  BookOpen,
  CalendarClock,
  CalendarDays,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Megaphone,
  ClipboardCheck,
  Network,
  Package,
  Presentation,
  Receipt,
  Route,
  Settings,
  Trophy,
  UserCircle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/logout-button";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: string[];
};

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Recently shipped sections — flagged "New" in the nav until a user opens them once. */
const NEW_ITEM_HREFS = ["/bundles", "/my-purchases", "/sessions", "/appointments", "/my-availability", "/trainer-portal", "/my-sessions"];
/** Every href whose visit gets recorded — a superset of NEW_ITEM_HREFS, since the dashboard's Getting Started checklist also reads "/feed" even though it's not itself a "New" item. */
const TRACKED_HREFS = [...NEW_ITEM_HREFS, "/feed"];

export function PortalNav({
  role,
  userName,
  referralProgramJoined,
  logoUrl,
}: {
  role: string;
  userName: string;
  referralProgramJoined: boolean;
  logoUrl?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [visited, setVisited] = useState<Set<string>>(new Set());

  useEffect(() => {
    setVisited(getVisitedHrefs());
  }, []);

  useEffect(() => {
    const matched = TRACKED_HREFS.find((href) => isActivePath(pathname, href));
    if (!matched) return;
    markHrefVisited(matched);
    setVisited((current) => (current.has(matched) ? current : new Set(current).add(matched)));
  }, [pathname]);

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: [] },
    { href: "/profile", label: "Profile", icon: UserCircle, roles: [] },
    { href: "/my-learning", label: "My Learning", icon: BookOpen, roles: ["LEARNER"] },
    { href: "/learning-paths", label: "Learning Paths", icon: Route, roles: ["LEARNER", "ADMIN"] },
    { href: "/bundles", label: "Bundles", icon: Package, roles: ["LEARNER", "ADMIN"] },
    { href: "/my-purchases", label: "My Purchases", icon: Receipt, roles: ["LEARNER"] },
    { href: "/feed", label: "Learning Feed", icon: BookOpen, roles: [] },
    { href: "/sessions", label: "Sessions", icon: CalendarDays, roles: [] },
    { href: "/appointments", label: "Appointments", icon: CalendarClock, roles: [] },
    { href: "/my-availability", label: "My Availability", icon: CalendarClock, roles: ["CAREER_OFFICER", "TRAINER"] },
    { href: "/my-achievements", label: "Achievements", icon: Trophy, roles: ["LEARNER"] },
    { href: "/crm", label: "CRM", icon: Users, roles: ["ADMIN", "CAREER_OFFICER"] },
    { href: "/trainers", label: "Trainer Network", icon: GraduationCap, roles: ["ADMIN", "TRAINER", "CAREER_OFFICER", "LEARNER"] },
    { href: "/trainer-portal", label: "Trainer Portal", icon: Presentation, roles: ["TRAINER"] },
    { href: "/my-sessions", label: "My Sessions", icon: ClipboardCheck, roles: [] },
    { href: referralProgramJoined ? "/referrals" : "/referrals/join", label: referralProgramJoined ? "My Referrals" : "Join Referral Program", icon: Network, roles: [] },
    { href: "/referral-campaigns", label: "Campaigns", icon: Megaphone, roles: [] },
    { href: "/certificates", label: "Certificates", icon: Award, roles: ["ADMIN", "LEARNER"] },
    { href: "/advertisements", label: "Advertisements", icon: Megaphone, roles: ["ADMIN"] },
    { href: "/admin", label: "Administration", icon: Settings, roles: ["ADMIN"] },
  ];

  const visibleItems = items.filter(
    (item) => item.roles.length === 0 || item.roles.includes(role),
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white md:flex md:flex-col dark:border-slate-800 dark:bg-slate-950">
        <Link href="/dashboard" className="flex h-20 items-center gap-3 px-6 text-lg font-bold text-teal-800 dark:text-teal-300">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="size-9 rounded-lg object-contain" />
          ) : (
            <span className="rounded-lg bg-gradient-to-br from-teal-600 to-violet-600 p-2 text-white"><HeartPulse className="size-5" /></span>
          )}
          MCG Learn
        </Link>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
          {visibleItems.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            const isNew = NEW_ITEM_HREFS.includes(href) && !visited.has(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200"
                    : "text-slate-600 hover:bg-teal-50 hover:text-teal-800 dark:text-slate-300 dark:hover:bg-teal-950",
                )}
              >
                <Icon className={cn("size-4", active && "text-teal-700 dark:text-teal-300")} /> {label}
                {isNew && (
                  <span className="ml-auto rounded-full bg-gradient-to-r from-teal-600 to-violet-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                    New
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3 dark:border-slate-800">
          <div className="mb-2 px-3 py-2">
            <p className="truncate text-sm font-semibold">{userName}</p>
            <p className="text-xs text-slate-500">{role.replaceAll("_", " ")}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <div className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t bg-white px-2 py-1 md:hidden dark:border-slate-800 dark:bg-slate-950">
        {visibleItems.slice(0, 5).map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          const isNew = NEW_ITEM_HREFS.includes(href) && !visited.has(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-w-20 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] transition-colors",
                active ? "text-teal-700 dark:text-teal-300" : "text-slate-600 dark:text-slate-400",
              )}
            >
              {isNew && <span className="absolute right-4 top-1 size-1.5 rounded-full bg-violet-600" />}
              <Icon className="size-5" /> {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={async () => {
            await createSupabaseBrowserClient().auth.signOut();
            router.replace("/login");
            router.refresh();
          }}
          className="flex min-w-20 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] text-slate-600 transition-colors dark:text-slate-400"
        >
          <LogOut className="size-5" /> Sign out
        </button>
      </div>
    </>
  );
}
