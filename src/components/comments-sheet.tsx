"use client";

import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { Avatar } from "./avatar";
import { timeAgo, type FeedVideo } from "@/lib/util";

type C = { id: string; body: string; createdAt: string; author: { handle: string; displayName: string; hue: number; avatarKey: string } };

export function CommentsSheet({
  video, meId, onClose, onPosted, onNeedLogin,
}: { video: FeedVideo | null; meId: string | null; onClose: () => void; onPosted: (id: string) => void; onNeedLogin: () => void }) {
  const [items, setItems] = useState<C[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!video) return;
    setItems([]);
    setError("");
    setLoading(true);
    fetch(`/api/videos/${video.id}/comments`)
      .then((r) => r.json())
      .then((j) => setItems(j.comments ?? []))
      .finally(() => setLoading(false));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [video, onClose]);

  if (!video) return null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!meId) return onNeedLogin();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    const r = await fetch(`/api/videos/${video!.id}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }),
    });
    const j = await r.json();
    setSending(false);
    if (!r.ok) return setError(j.error ?? "Không gửi được bình luận.");
    setItems((c) => [j.comment, ...c]);
    onPosted(video!.id);
    setText("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-stretch lg:justify-end" role="dialog" aria-modal="true" aria-label="Bình luận">
      <button aria-label="Đóng" className="absolute inset-0 cursor-default bg-black/60" onClick={onClose} />
      <div className="relative flex max-h-[80dvh] w-full animate-up flex-col rounded-t-3xl bg-ink-2 lg:max-h-none lg:w-[420px] lg:rounded-none">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="font-bold">{loading ? video.comments : items.length} bình luận</h2>
          <button onClick={onClose} aria-label="Đóng" className="grid size-10 cursor-pointer place-items-center rounded-full hover:bg-white/10"><X className="size-5" aria-hidden /></button>
        </div>

        <ul className="min-h-[200px] flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {loading && <li className="text-sm text-mist">Đang tải…</li>}
          {!loading && items.length === 0 && <li className="py-10 text-center text-sm text-mist">Chưa có bình luận. Hãy là người đầu tiên!</li>}
          {items.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar name={c.author.displayName} hue={c.author.hue} size={36} />
              <div className="min-w-0">
                <p className="text-[13px] text-mist"><span className="font-bold text-white">{c.author.displayName}</span> · {timeAgo(c.createdAt)}</p>
                <p className="mt-0.5 break-words text-[15px]">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <form onSubmit={send} className="safe-bottom border-t border-white/10 p-3">
          {error && <p role="alert" className="mb-2 px-1 text-sm text-red-400">{error}</p>}
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="cmt">Bình luận</label>
            <input
              id="cmt" ref={input} value={text} onChange={(e) => setText(e.target.value)} maxLength={500}
              placeholder={meId ? "Thêm bình luận…" : "Đăng nhập để bình luận"} onFocus={() => !meId && onNeedLogin()}
              className="input !rounded-full"
            />
            <button type="submit" disabled={!text.trim() || sending} aria-label="Gửi" className="btn btn-primary !px-4"><Send className="size-5" aria-hidden /></button>
          </div>
        </form>
      </div>
    </div>
  );
}
