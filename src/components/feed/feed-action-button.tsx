import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { FeedType } from "@prisma/client";
import { buttonVariants } from "@/components/ui/button";
import { getFeedActionHref, getFeedActionKind, getFeedActionLabel } from "@/lib/feed-actions";

export function FeedActionButton({
  id,
  type,
  externalUrl,
}: {
  id: string;
  type: FeedType;
  externalUrl?: string | null;
}) {
  const href = getFeedActionHref(id, type);
  const kind = getFeedActionKind(type);
  const opensExternal = kind === "external" && Boolean(externalUrl);

  return (
    <Link
      href={href}
      target={opensExternal ? "_blank" : undefined}
      rel={opensExternal ? "noopener noreferrer" : undefined}
      className={buttonVariants({ size: "sm" })}
    >
      {getFeedActionLabel(type)} <ExternalLink className="size-3" />
    </Link>
  );
}
