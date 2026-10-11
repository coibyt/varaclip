/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Play } from "lucide-react";
import { compact, type FeedVideo } from "@/lib/util";

export function VideoGrid({ videos, empty }: { videos: FeedVideo[]; empty?: string }) {
  if (videos.length === 0) return <p className="py-16 text-center text-mist">{empty ?? "Chưa có video."}</p>;
  return (
    <ul className="grid grid-cols-3 gap-1 sm:gap-2 xl:grid-cols-4">
      {videos.map((v) => (
        <li key={v.id}>
          <Link href={`/v/${v.id}`} className="group relative block aspect-[3/4] overflow-hidden rounded-lg bg-ink-3 sm:rounded-xl" aria-label={v.caption || "Xem video"}>
            {v.thumbUrl ? (
              <img src={v.thumbUrl} alt="" loading="lazy" className="size-full object-cover transition duration-300 group-hover:scale-105" />
            ) : (
              <video src={`${v.videoUrl}#t=0.5`} preload="metadata" muted playsInline className="size-full object-cover" />
            )}
            <div aria-hidden className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2 pt-8">
              <span className="flex items-center gap-1 text-xs font-bold"><Play className="size-3.5 fill-white" /> {compact(v.views)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
