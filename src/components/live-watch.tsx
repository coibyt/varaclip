"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarCheck, Eye, MessageCircle, Phone } from "lucide-react";
import { Avatar } from "./avatar";
import { ChatPanel } from "./chat-panel";
import { FollowButton } from "./follow-button";
import { useT } from "./locale-provider";

type Props = {
  streamId: string;
  title: string;
  playerSrc: string;
  initialStatus: string;
  meId: string | null;
  followed: boolean;
  creator: { id: string; handle: string; displayName: string; salonName: string; hue: number; avatarUrl: string; bookingUrl: string; phone: string };
};

/** Viewer page: Cloudflare player + live chat, with the salon's follow / booking / message shortcuts. */
export function LiveWatch({ streamId, title, playerSrc, initialStatus, meId, followed, creator }: Props) {
  const t = useT();
  const [status, setStatus] = useState(initialStatus);
  const [viewers, setViewers] = useState(0);
  const name = creator.salonName || creator.displayName;
  const live = status === "LIVE";
  const cta = creator.bookingUrl
    ? { href: creator.bookingUrl, label: t("card.book"), icon: CalendarCheck, ext: true }
    : creator.phone
      ? { href: `tel:${creator.phone.replace(/[^+\d]/g, "")}`, label: t("card.call"), icon: Phone, ext: false }
      : null;

  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 pb-28 pt-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:pb-8 lg:pt-6">
      <div className="min-w-0">
        <div className="relative mx-auto aspect-[9/16] max-h-[72dvh] w-full max-w-[420px] overflow-hidden rounded-2xl bg-black lg:max-h-[78dvh]">
          {live ? (
            <iframe
              src={playerSrc} title={title || name} className="absolute inset-0 size-full border-0"
              allow="autoplay; fullscreen; picture-in-picture" allowFullScreen
            />
          ) : (
            <div className="grid size-full place-items-center p-6 text-center text-mist">{t("live.ended")}</div>
          )}
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
            <span className={`rounded-md px-2 py-1 text-xs font-extrabold uppercase ${live ? "bg-red-600 text-white" : "bg-white/20 text-white"}`}>{live ? t("live.badge") : t("live.endedBadge")}</span>
            {live && <span className="flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-xs font-bold tabular-nums"><Eye className="size-3.5" aria-hidden /> {viewers}</span>}
          </div>
        </div>

        <div className="mx-auto mt-4 flex max-w-[420px] items-center gap-3">
          <Link href={`/u/${creator.handle}`} className="shrink-0"><Avatar name={creator.displayName} hue={creator.hue} url={creator.avatarUrl} size={48} /></Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{title || name}</p>
            <Link href={`/u/${creator.handle}`} className="block truncate text-sm text-mist hover:underline">{name} · @{creator.handle}</Link>
          </div>
        </div>
        <div className="mx-auto mt-3 flex max-w-[420px] flex-wrap gap-2">
          {creator.id !== meId && <FollowButton handle={creator.handle} initial={followed} loggedIn={Boolean(meId)} />}
          {cta && (
            <a href={cta.href} {...(cta.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="btn btn-primary"><cta.icon className="size-5" aria-hidden /> {cta.label}</a>
          )}
          {creator.id !== meId && <Link href={meId ? `/messages/${creator.handle}` : `/login?next=${encodeURIComponent(`/messages/${creator.handle}`)}`} className="btn btn-ghost"><MessageCircle className="size-5" aria-hidden /> {t("msg.message")}</Link>}
        </div>
      </div>

      <ChatPanel
        streamId={streamId} creatorId={creator.id} meId={meId} isOwner={meId === creator.id}
        onUpdate={(u) => { setStatus(u.status); setViewers(u.viewers); }}
        className="h-[52dvh] lg:h-[calc(100dvh-3rem)] lg:max-h-[780px]"
      />
    </div>
  );
}
