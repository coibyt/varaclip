"use client";

import { useRef } from "react";
import { Sparkles } from "lucide-react";

/** Full-frame video with the browser's own controls and a small VaraClip badge that opens the full page. */
export function EmbedPlayer({ id, src, poster, name }: { id: string; src: string; poster: string; name: string }) {
  const counted = useRef(false);
  return (
    <div className="fixed inset-0 bg-black">
      <video
        src={src}
        poster={poster || undefined}
        controls
        playsInline
        preload="metadata"
        controlsList="nodownload"
        className="size-full object-contain"
        onPlay={() => {
          if (counted.current) return;
          counted.current = true;
          fetch(`/api/videos/${id}/view`, { method: "POST" }).catch(() => {});
        }}
      />
      <a
        href={`/v/${id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute left-3 top-3 flex max-w-[75%] items-center gap-2 rounded-full bg-black/55 py-1.5 pl-1.5 pr-3 text-xs font-bold text-white backdrop-blur transition hover:bg-black/75"
      >
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-glow to-gold text-ink"><Sparkles className="size-3.5" aria-hidden /></span>
        <span className="truncate">{name} · VaraClip</span>
      </a>
    </div>
  );
}
