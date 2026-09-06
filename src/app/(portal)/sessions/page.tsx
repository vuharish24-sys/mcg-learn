import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseFeedContent, SESSION_TYPE_LABEL, getFeedActionHref } from "@/lib/feed-actions";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default async function SessionsPage() {
  await requireUser();

  const items = await prisma.feedItem.findMany({
    where: { type: "WEBINAR", status: "PUBLISHED" },
  });

  const now = Date.now();
  const sessions = items
    .map((item) => ({ item, content: parseFeedContent(item.content) }))
    .filter(({ content }) => !content.webinarAt || new Date(content.webinarAt).getTime() >= now)
    .sort((a, b) => {
      const at = a.content.webinarAt ? new Date(a.content.webinarAt).getTime() : Infinity;
      const bt = b.content.webinarAt ? new Date(b.content.webinarAt).getTime() : Infinity;
      return at - bt;
    });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-teal-700">Upcoming</p>
        <h1 className="mt-1 text-3xl font-bold">Sessions</h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          Free career sessions, webinars, and live classes — reserve your spot below.
        </p>
      </div>

      <div className="grid gap-4">
        {sessions.map(({ item, content }) => (
          <Card key={item.id} className="transition duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="gap-1 bg-teal-600 text-white">
                    <CalendarDays className="size-3" /> {SESSION_TYPE_LABEL[content.sessionType ?? "WEBINAR"]}
                  </Badge>
                  {content.webinarAt && (
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {formatDate(content.webinarAt)}
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-lg font-bold">{item.title}</h2>
                <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-slate-500">{item.description}</p>
                {content.location && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                    <MapPin className="size-3.5" /> {content.location}
                  </p>
                )}
              </div>
              <Link href={getFeedActionHref(item.id, item.type)} className={buttonVariants({ variant: "gradient" })}>
                View &amp; register
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {sessions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-slate-500">
            No upcoming sessions right now — check back soon.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
