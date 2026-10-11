"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Heart, MessageCircle, Trash2 } from "lucide-react";
import { compact, timeAgo, type FeedVideo } from "@/lib/util";

export function StudioRow({ v }: { v: FeedVideo }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function del() {
    setBusy(true);
    const r = await fetch(`/api/videos/${v.id}`, { method: "DELETE" });
    if (r.ok) router.refresh();
    else setBusy(false);
  }

  return (
    <li className="flex gap-4 rounded-2xl bg-ink-2 p-3">
      <Link href={`/v/${v.id}`} className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-xl bg-ink-3" aria-label="Xem video">
        {v.thumbUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.thumbUrl} alt="" className="size-full object-cover" />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[15px] font-semibold">{v.caption || <span className="text-mist">(không có mô tả)</span>}</p>
        <p className="mt-0.5 text-xs text-mist">{timeAgo(v.createdAt)}</p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums text-white/85">
          <span className="flex items-center gap-1"><Eye className="size-4 text-mist" aria-hidden /> {compact(v.views)}</span>
          <span className="flex items-center gap-1"><Heart className="size-4 text-mist" aria-hidden /> {compact(v.likes)}</span>
          <span className="flex items-center gap-1"><MessageCircle className="size-4 text-mist" aria-hidden /> {compact(v.comments)}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-start">
        {confirm ? (
          <div className="flex flex-col gap-1">
            <button onClick={del} disabled={busy} className="btn !min-h-[40px] bg-red-500 !px-4 text-sm text-white hover:bg-red-600">Xoá</button>
            <button onClick={() => setConfirm(false)} className="btn btn-ghost !min-h-[40px] !px-4 text-sm">Huỷ</button>
          </div>
        ) : (
          <button onClick={() => setConfirm(true)} aria-label="Xoá video" className="grid size-11 cursor-pointer place-items-center rounded-full text-mist transition hover:bg-red-500/15 hover:text-red-400"><Trash2 className="size-5" aria-hidden /></button>
        )}
      </div>
    </li>
  );
}
