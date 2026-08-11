import type { ReactNode } from "react";
import { HeartPulse } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function AuthLayout({
  eyebrow,
  title,
  tagline,
  footer,
  logoUrl,
  children,
}: {
  eyebrow: string;
  title: string;
  tagline?: ReactNode;
  footer?: ReactNode;
  logoUrl?: string | null;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-teal-700 via-teal-800 to-violet-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-violet-500/30 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-amber-400/20 blur-3xl" />

        <div className="relative flex items-center gap-3 text-xl font-bold">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="size-10 rounded-xl bg-white/15 object-contain p-1" />
          ) : (
            <span className="rounded-xl bg-white/15 p-2"><HeartPulse /></span>
          )}
          MCG Learn
        </div>
        <div className="relative">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">{eyebrow}</p>
          <h1 className="max-w-xl text-5xl font-bold leading-tight">{title}</h1>
          {tagline && <p className="mt-4 max-w-lg text-teal-100">{tagline}</p>}
        </div>
        <p className="relative text-sm text-teal-100">{footer}</p>
      </section>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-teal-50 via-white to-violet-50 p-6 dark:from-slate-950 dark:via-slate-950 dark:to-violet-950/30">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 size-[36rem] rounded-full bg-teal-200/70 blur-3xl dark:bg-teal-800/30" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-32 size-[34rem] rounded-full bg-violet-200/70 blur-3xl dark:bg-violet-900/30" />
        <div aria-hidden="true" className="pointer-events-none absolute left-1/3 top-1/2 size-72 -translate-y-1/2 rounded-full bg-amber-200/40 blur-3xl dark:bg-amber-900/20" />

        <div className="absolute right-5 top-5 z-10">
          <ThemeToggle />
        </div>

        <div className="relative z-10 w-full">{children}</div>
      </section>
    </main>
  );
}
