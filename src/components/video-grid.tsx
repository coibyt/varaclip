/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Play } from "lucide-react";
import { compact, type FeedVideo } from "@/lib/util";
import { BadgeChip } from "./video-badge";

export function VideoGrid({ videos, empty, watch, locale, showViews = false }: { videos: FeedVideo[]; empty: string; watch: string; locale: string; showViews?: boolean }) {
  if (videos.length === 0) return <p className="py-16 text-center text-mist">{empty}</p>;
  return (
    <ul className="grid grid-cols-3 gap-1 sm:gap-2 xl:grid-cols-4">
      {videos.map((v) => (
        <li key={v.id}>
          <Link href={`/v/${v.id}`} className="group relative block aspect-[3/4] overflow-hidden rounded-lg bg-ink-3 sm:rounded-xl" aria-label={v.caption || watch}>
            {v.thumbUrl ? (
              <img src={v.thumbUrl} alt="" loading="lazy" className="size-full object-cover transition duration-300 group-hover:scale-105" />
            ) : (
              <video src={`${v.videoUrl}#t=0.5`} preload="metadata" muted playsInline className="size-full object-cover" />
            )}
            {v.badge && <BadgeChip badge={v.badge} className="absolute left-1.5 top-1.5" />}
            {showViews && (
              <div aria-hidden className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2 pt-8">
                <span className="flex items-center gap-1 text-xs font-bold"><Play className="size-3.5 fill-white" /> {compact(v.views, locale)}</span>
              </div>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
