"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarCheck, ExternalLink, Eye, MessageCircle, Phone } from "lucide-react";
import { Avatar } from "./avatar";
import { CameraViewer } from "./camera-viewer";
import { ChatPanel } from "./chat-panel";
import { FollowButton } from "./follow-button";
import { useT } from "./locale-provider";

type Props = {
  streamId: string;
  title: string;
  platform: string;
  platformName: string;
  sourceUrl: string;
  /** null when the platform cannot be embedded (TikTok) */
  embedSrc: string | null;
  initialStatus: string;
  meId: string | null;
  followed: boolean;
  creator: { id: string; handle: string; displayName: string; salonName: string; hue: number; avatarUrl: string; bookingUrl: string; phone: string };
};

/** Viewer page: the live (embedded, or a button to open it) next to the VaraClip chat. */
export function LiveWatch({ streamId, title, platform, platformName, sourceUrl, embedSrc, initialStatus, meId, followed, creator }: Props) {
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
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
          {!live ? (
            <div className="grid size-full place-items-center p-6 text-center text-mist">{t("live.ended")}</div>
          ) : platform === "camera" ? (
            <CameraViewer streamId={streamId} />
          ) : embedSrc ? (
            <iframe
              src={embedSrc} title={title || name} className="absolute inset-0 size-full border-0"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div className="grid size-full place-items-center bg-gradient-to-br from-ink-3 to-black p-6 text-center">
              <div>
                <p className="mx-auto max-w-sm text-sm text-white/85">{t("live.externalHint", { platform: platformName })}</p>
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-4"><ExternalLink className="size-5" aria-hidden /> {t("live.watchOn", { platform: platformName })}</a>
              </div>
            </div>
          )}
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
            <span className={`rounded-md px-2 py-1 text-xs font-extrabold uppercase ${live ? "bg-red-600 text-white" : "bg-white/20 text-white"}`}>{live ? t("live.badge") : t("live.endedBadge")}</span>
            {live && <span className="flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-xs font-bold tabular-nums"><Eye className="size-3.5" aria-hidden /> {viewers}</span>}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Link href={`/u/${creator.handle}`} className="shrink-0"><Avatar name={creator.displayName} hue={creator.hue} url={creator.avatarUrl} size={48} /></Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{title || name}</p>
            <Link href={`/u/${creator.handle}`} className="block truncate text-sm text-mist hover:underline">{name} · @{creator.handle} · {platformName}</Link>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {creator.id !== meId && <FollowButton handle={creator.handle} initial={followed} loggedIn={Boolean(meId)} />}
          {cta && (
            <a href={cta.href} {...(cta.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="btn btn-primary"><cta.icon className="size-5" aria-hidden /> {cta.label}</a>
          )}
          {creator.id !== meId && <Link href={meId ? `/messages/${creator.handle}` : `/login?next=${encodeURIComponent(`/messages/${creator.handle}`)}`} className="btn btn-ghost"><MessageCircle className="size-5" aria-hidden /> {t("msg.message")}</Link>}
          {embedSrc && live && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost"><ExternalLink className="size-5" aria-hidden /> {t("live.openOn", { platform: platformName })}</a>}
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
