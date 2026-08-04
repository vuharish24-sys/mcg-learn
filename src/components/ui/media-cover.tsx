import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Cover media that scales to fill its card frame (CDN-safe). */
export function MediaCover({
  src,
  alt = "",
  className,
  children,
  fit = "cover",
}: {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  children?: ReactNode;
  fit?: "cover" | "contain";
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-800 to-cyan-950",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- external OG/CDN URLs; referrerPolicy required for Instagram
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          decoding="async"
          className={cn(
            "pointer-events-none absolute inset-0 h-full w-full max-w-none",
            fit === "contain" ? "object-contain object-center" : "object-cover object-center",
          )}
        />
      ) : null}
      {children}
    </div>
  );
}
