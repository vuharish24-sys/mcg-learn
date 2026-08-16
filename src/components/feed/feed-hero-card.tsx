import Link from "next/link";
import { ArrowRight, Gift, PlayCircle, Sparkles } from "lucide-react";
import { MediaCover } from "@/components/ui/media-cover";
import { Card } from "@/components/ui/card";

export type FeedHeroCardProps =
  | { kind: "continue"; title: string; coverUrl: string | null; progressPercent: number; href: string }
  | {
      kind: "benefit";
      title: string;
      valueLabel: string;
      description: string | null;
      imageUrl: string | null;
      href: string;
    }
  | { kind: "start"; title: string; description: string | null; coverUrl: string | null; href: string };

export function FeedHeroCard(props: FeedHeroCardProps) {
  const image = props.kind === "benefit" ? props.imageUrl : props.coverUrl;

  return (
    <Link href={props.href} prefetch={false} className="group block w-full">
      <Card className="relative h-52 w-full overflow-hidden border-0 shadow-lg ring-1 ring-slate-200/80 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:h-60 dark:ring-slate-800">
        <MediaCover src={image} alt="" fit="cover" className="h-full w-full">
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10" />
          <div className="relative flex h-full flex-col justify-end p-5 text-white sm:p-7">
            {props.kind === "continue" && (
              <>
                <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                  <PlayCircle className="size-3.5" /> Pick up where you left off
                </span>
                <h2 className="max-w-xl text-xl font-bold leading-snug sm:text-2xl">{props.title}</h2>
                <div className="mt-3 max-w-xs space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-white/80">
                    <span>Progress</span>
                    <span className="font-semibold">{props.progressPercent}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-teal-300"
                      style={{ width: `${Math.min(100, Math.max(0, props.progressPercent))}%` }}
                    />
                  </div>
                </div>
                <span className="mt-4 inline-flex w-fit items-center gap-1.5 text-sm font-semibold">
                  Continue <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </span>
              </>
            )}

            {props.kind === "benefit" && (
              <>
                <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                  <Gift className="size-3.5" /> Scholarship available
                </span>
                <p className="text-2xl font-black leading-none sm:text-3xl">{props.valueLabel}</p>
                <h2 className="mt-1 max-w-xl text-base font-bold leading-snug sm:text-lg">{props.title}</h2>
                {props.description && (
                  <p className="mt-1 line-clamp-1 max-w-xl text-sm text-white/85">{props.description}</p>
                )}
                <span className="mt-4 inline-flex w-fit items-center gap-1.5 text-sm font-semibold">
                  View details <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </span>
              </>
            )}

            {props.kind === "start" && (
              <>
                <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                  <Sparkles className="size-3.5" /> Start here
                </span>
                <h2 className="max-w-xl text-xl font-bold leading-snug sm:text-2xl">{props.title}</h2>
                {props.description && (
                  <p className="mt-1 line-clamp-2 max-w-xl text-sm text-white/85 sm:text-base">{props.description}</p>
                )}
                <span className="mt-4 inline-flex w-fit items-center gap-1.5 text-sm font-semibold">
                  Get started <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </span>
              </>
            )}
          </div>
        </MediaCover>
      </Card>
    </Link>
  );
}
