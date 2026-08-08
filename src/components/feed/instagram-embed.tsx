"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

const EMBED_SCRIPT_SRC = "https://www.instagram.com/embed.js";

/**
 * Renders Instagram's own official embed widget (the same one you get from a post's
 * "Embed" button) so the reel plays in-app instead of redirecting to Instagram. This
 * is Instagram's supported embed path — no API key needed, and it counts as a real
 * view like any other embedded play.
 */
export function InstagramEmbed({ url }: { url: string }) {
  useEffect(() => {
    function process() {
      window.instgrm?.Embeds.process();
    }

    if (window.instgrm) {
      process();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${EMBED_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", process);
      return () => existing.removeEventListener("load", process);
    }

    const script = document.createElement("script");
    script.src = EMBED_SCRIPT_SRC;
    script.async = true;
    script.addEventListener("load", process);
    document.body.appendChild(script);
  }, [url]);

  return (
    <div className="flex justify-center">
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{
          background: "#FFF",
          border: 0,
          borderRadius: 12,
          margin: 1,
          maxWidth: 540,
          minWidth: 326,
          padding: 0,
          width: "99%",
        }}
      />
    </div>
  );
}
