"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "./avatar";
import { useI18n } from "./locale-provider";
import { timeAgo } from "@/lib/util";
import type { ChatAuthor } from "@/lib/chat";

type Convo = { with: ChatAuthor & { salonName: string }; last: string; lastAt: string; fromMe: boolean; unread: number };

/** List of conversations; refreshes every few seconds. */
export function Inbox() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<Convo[] | null>(null);

  useEffect(() => {
    let stop = false;
    async function load() {
      if (document.hidden) return;
      const r = await fetch("/api/messages", { cache: "no-store" }).catch(() => null);
      if (!r?.ok || stop) return;
      setItems((await r.json()).conversations);
    }
    load();
    const iv = setInterval(load, 8000);
    return () => { stop = true; clearInterval(iv); };
  }, []);

  if (items === null) return <p className="py-16 text-center text-mist">{t("cm.loading")}</p>;
  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-white/15 p-10 text-center">
        <p className="font-bold">{t("msg.empty")}</p>
        <p className="mt-1 text-sm text-mist">{t("msg.emptySub")}</p>
      </div>
    );
  }
  return (
    <ul className="mt-4 space-y-2">
      {items.map((c) => (
        <li key={c.with.id}>
          <Link href={`/messages/${c.with.handle}`} className="flex items-center gap-3 rounded-2xl bg-ink-2 p-3 transition hover:bg-ink-3">
            <Avatar name={c.with.displayName} hue={c.with.hue} url={c.with.avatarUrl} size={48} />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate font-bold">{c.with.salonName || c.with.displayName}</span>
                <span className="shrink-0 text-xs text-mist">{timeAgo(c.lastAt, locale, t("time.now"))}</span>
              </span>
              <span className={`block truncate text-sm ${c.unread ? "font-semibold text-white" : "text-mist"}`}>{c.fromMe ? `${t("msg.you")}: ` : ""}{c.last}</span>
            </span>
            {c.unread > 0 && <span className="grid min-w-6 place-items-center rounded-full bg-glow px-1.5 text-xs font-extrabold tabular-nums">{c.unread}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
