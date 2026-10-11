"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { Avatar } from "./avatar";
import { useI18n } from "./locale-provider";
import type { ChatAuthor, DirectMsg } from "@/lib/chat";

type Other = ChatAuthor & { salonName: string; isSalon: boolean };

/** One-to-one conversation; polls every 3 s while visible. */
export function Thread({ handle }: { handle: string }) {
  const { t, locale } = useI18n();
  const [other, setOther] = useState<Other | null>(null);
  const [messages, setMessages] = useState<DirectMsg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const lastAt = useRef<string | null>(null);

  const merge = useCallback((incoming: DirectMsg[]) => {
    setMessages((cur) => {
      const have = new Set(cur.map((m) => m.id));
      return [...cur, ...incoming.filter((m) => !have.has(m.id))];
    });
    const last = incoming[incoming.length - 1];
    if (last && (!lastAt.current || last.createdAt > lastAt.current)) lastAt.current = last.createdAt;
  }, []);

  useEffect(() => {
    let stop = false;
    async function poll() {
      if (stop || document.hidden) return;
      const q = lastAt.current ? `?after=${encodeURIComponent(lastAt.current)}` : "";
      const r = await fetch(`/api/messages/${handle}${q}`, { cache: "no-store" }).catch(() => null);
      if (!r?.ok || stop) return;
      const j = await r.json();
      setOther(j.with);
      merge(j.messages);
    }
    poll();
    const iv = setInterval(poll, 3000);
    return () => { stop = true; clearInterval(iv); };
  }, [handle, merge]);

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
    const r = await fetch(`/api/messages/${handle}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
    const j = await r.json().catch(() => ({}));
    setSending(false);
    if (!r.ok) return setError(j.error ?? t("chat.sendFail"));
    setText("");
    stick.current = true;
    merge([j.message]);
  }

  const time = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="mx-auto flex h-[calc(100dvh-var(--nav-h))] max-w-2xl flex-col px-4 pt-3 lg:h-dvh lg:pt-6">
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <Link href="/messages" aria-label={t("nav.messages")} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-white/10"><ArrowLeft className="size-5" aria-hidden /></Link>
        {other && (
          <Link href={`/u/${other.handle}`} className="flex min-w-0 items-center gap-3">
            <Avatar name={other.displayName} hue={other.hue} url={other.avatarUrl} size={40} />
            <span className="min-w-0">
              <span className="block truncate font-bold">{other.salonName || other.displayName}</span>
              <span className="block truncate text-xs text-mist">@{other.handle}</span>
            </span>
          </Link>
        )}
      </div>

      <div
        ref={list}
        onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto py-4"
      >
        {messages.length === 0 && <p className="py-10 text-center text-sm text-mist">{t("msg.startHint")}</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug ${m.mine ? "rounded-br-md bg-glow text-white" : "rounded-bl-md bg-ink-3"}`}>
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className={`mt-0.5 text-[10px] ${m.mine ? "text-white/75" : "text-mist"}`}>{time(m.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="pb-3 pt-2">
        {error && <p role="alert" className="mb-2 px-1 text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="dm">{t("msg.placeholder")}</label>
          <input id="dm" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder={t("msg.placeholder")} autoComplete="off" className="input !rounded-full" />
          <button type="submit" disabled={!text.trim() || sending} aria-label={t("cm.send")} className="btn btn-primary !px-4"><Send className="size-5" aria-hidden /></button>
        </div>
      </form>
    </div>
  );
}
