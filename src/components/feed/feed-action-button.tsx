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

  // Next.js <Link> prefetches the RSC payload by fetching the href, which follows
  // this route's redirect cross-origin and gets blocked by CORS — the redirect target
  // never sends Access-Control-Allow-Origin (it's not meant to be fetched). A plain <a>
  // skips that entirely and just navigates, which is all this needs anyway.
  if (opensExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm" })}>
        {getFeedActionLabel(type)} <ExternalLink className="size-3" />
      </a>
    );
  }

  return (
    <Link href={href} className={buttonVariants({ size: "sm" })}>
      {getFeedActionLabel(type)} <ExternalLink className="size-3" />
    </Link>
  );
}
