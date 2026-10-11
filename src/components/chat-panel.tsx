"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Ban, Send, Trash2 } from "lucide-react";
import { Avatar } from "./avatar";
import { useT } from "./locale-provider";
import type { ChatMsg } from "@/lib/chat";

type Props = {
  streamId: string;
  creatorId: string;
  meId: string | null;
  /** The salon that owns the stream: can delete any message and block chatters. */
  isOwner?: boolean;
  /** Reports status and viewer count each poll. */
  onUpdate?: (u: { status: string; viewers: number }) => void;
  className?: string;
};

const POLL_MS = 2000;

function viewerKey() {
  try {
    let k = sessionStorage.getItem("gr_vk");
    if (!k) {
      k = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
      sessionStorage.setItem("gr_vk", k);
    }
    return k;
  } catch {
    return Math.random().toString(36).slice(2, 12);
  }
}

/** Live chat: polls the server every couple of seconds, keeps scrolled to the newest message. */
export function ChatPanel({ streamId, creatorId, meId, isOwner = false, onUpdate, className = "" }: Props) {
  const t = useT();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [status, setStatus] = useState("LIVE");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const lastAt = useRef<string | null>(null);
  const key = useRef("");
  const cb = useRef(onUpdate);
  cb.current = onUpdate;

  const merge = useCallback((incoming: ChatMsg[], removed: string[] = []) => {
    setMessages((cur) => {
      const gone = new Set(removed);
      const have = new Set(cur.map((m) => m.id));
      const next = [...cur.filter((m) => !gone.has(m.id)), ...incoming.filter((m) => !have.has(m.id) && !gone.has(m.id))];
      return next.slice(-200);
    });
    const last = incoming[incoming.length - 1];
    if (last && (!lastAt.current || last.createdAt > lastAt.current)) lastAt.current = last.createdAt;
  }, []);

  useEffect(() => {
    key.current = viewerKey();
    let stop = false;
    async function poll() {
      if (stop || document.hidden) return;
      const q = new URLSearchParams({ vk: key.current });
      if (lastAt.current) q.set("after", lastAt.current);
      try {
        const r = await fetch(`/api/live/${streamId}/chat?${q}`, { cache: "no-store" });
        if (!r.ok || stop) return;
        const j = await r.json();
        merge(j.messages ?? [], j.removed ?? []);
        setStatus(j.status);
        cb.current?.({ status: j.status, viewers: j.viewers ?? 0 });
      } catch {
        /* transient network error: try again on the next tick */
      }
    }
    poll();
    const iv = setInterval(poll, POLL_MS);
    return () => { stop = true; clearInterval(iv); };
  }, [streamId, merge]);

  useEffect(() => {
    const el = list.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    const r = await fetch(`/api/live/${streamId}/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }),
    });
    const j = await r.json().catch(() => ({}));
    setSending(false);
    if (!r.ok) return setError(j.error ?? t("chat.sendFail"));
    setText("");
    stick.current = true;
    merge([j.message]);
  }

  async function remove(id: string) {
    setMessages((cur) => cur.filter((m) => m.id !== id));
    await fetch(`/api/live/${streamId}/chat/${id}`, { method: "DELETE" });
  }

  async function ban(userId: string) {
    if (!window.confirm(t("chat.banConfirm"))) return;
    setMessages((cur) => cur.filter((m) => m.author.id !== userId));
    await fetch(`/api/live/${streamId}/ban`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }),
    });
  }

  const ended = status !== "LIVE";

  return (
    <div className={`flex min-h-0 flex-col rounded-2xl bg-ink-2 ${className}`}>
      <div className="border-b border-white/10 px-4 py-3 text-sm font-bold">{t("chat.title")}</div>

      <div
        ref={list}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        }}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3"
        aria-live="polite"
        aria-label={t("chat.title")}
      >
        {messages.length === 0 && <p className="py-8 text-center text-sm text-mist">{t("chat.empty")}</p>}
        {messages.map((m) => (
          <div key={m.id} className="group flex items-start gap-2.5">
            <Avatar name={m.author.displayName} hue={m.author.hue} url={m.author.avatarUrl} size={28} />
            <p className="min-w-0 flex-1 break-words text-[14px] leading-snug">
              <Link href={`/u/${m.author.handle}`} className="font-bold text-white/90 hover:underline">{m.author.displayName}</Link>
              {m.author.id === creatorId && <span className="ml-1.5 rounded bg-glow px-1.5 py-px align-middle text-[10px] font-extrabold uppercase text-white">{t("chat.host")}</span>}
              <span className="ml-2 text-white/90">{m.body}</span>
            </p>
            {(isOwner || m.author.id === meId) && (
              <span className="flex shrink-0 gap-0.5">
                <button type="button" onClick={() => remove(m.id)} aria-label={t("chat.delete")} className="grid size-8 cursor-pointer place-items-center rounded-full text-mist hover:bg-white/10 hover:text-red-400"><Trash2 className="size-4" aria-hidden /></button>
                {isOwner && m.author.id !== meId && (
                  <button type="button" onClick={() => ban(m.author.id)} aria-label={t("chat.ban")} className="grid size-8 cursor-pointer place-items-center rounded-full text-mist hover:bg-white/10 hover:text-red-400"><Ban className="size-4" aria-hidden /></button>
                )}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 p-3">
        {ended ? (
          <p className="py-2 text-center text-sm text-mist">{t("live.ended")}</p>
        ) : meId ? (
          <form onSubmit={send}>
            {error && <p role="alert" className="mb-2 px-1 text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <label className="sr-only" htmlFor={`chat-${streamId}`}>{t("chat.placeholder")}</label>
              <input
                id={`chat-${streamId}`} value={text} onChange={(e) => setText(e.target.value)} maxLength={300}
                placeholder={t("chat.placeholder")} className="input !rounded-full !py-2.5 text-sm" autoComplete="off"
              />
              <button type="submit" disabled={!text.trim() || sending} aria-label={t("cm.send")} className="btn btn-primary !min-h-[44px] !px-4"><Send className="size-5" aria-hidden /></button>
            </div>
          </form>
        ) : (
          <Link href={`/login?next=${encodeURIComponent(typeof window === "undefined" ? "/live" : window.location.pathname)}`} className="btn btn-primary w-full">{t("chat.loginToChat")}</Link>
        )}
      </div>
    </div>
  );
}
