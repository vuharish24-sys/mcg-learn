import { extractYouTubeVideoId } from "@/lib/feed-actions";

export function YouTubeEmbed({ url, title }: { url: string; title: string }) {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title={title}
        className="size-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
