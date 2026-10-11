"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bookmark, CalendarCheck, Check, Heart, MapPin, MessageCircle, Pencil, Phone, Play, Plus, Share2, Volume2, VolumeX,
} from "lucide-react";
import { Avatar } from "./avatar";
import { CommentsSheet } from "./comments-sheet";
import { compact, type FeedVideo } from "@/lib/util";
import { useI18n } from "./locale-provider";
import { LanguageSwitcher } from "./language-switcher";
import { DownloadButton } from "./download-button";

type Props = {
  initial: FeedVideo[];
  meId: string | null;
  /** Hide the For You / Following switch (e.g. when showing one profile's videos). */
  tabs?: boolean;
  /** Fixed list: no infinite loading. */
  fixed?: boolean;
  startId?: string;
};

export function VideoFeed({ initial, meId, tabs = true, fixed = false, startId }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const [tab, setTab] = useState<"foryou" | "following">("foryou");
  const [videos, setVideos] = useState<FeedVideo[]>(initial);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(fixed);
  const [activeId, setActiveId] = useState<string | null>(initial[0]?.id ?? null);
  const [muted, setMuted] = useState(true);
  const [commentsFor, setCommentsFor] = useState<FeedVideo | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const requireLogin = useCallback(() => {
    router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
  }, [router]);

  const patch = useCallback((id: string, fn: (v: FeedVideo) => FeedVideo) => {
    setVideos((vs) => vs.map((v) => (v.id === id ? fn(v) : v)));
  }, []);

  const loadMore = useCallback(
    async (replace = false, forTab = tab) => {
      if (loading || (done && !replace)) return;
      setLoading(true);
      try {
        const exclude = replace ? "" : videos.map((v) => v.id).slice(-150).join(",");
        const r = await fetch(`/api/feed?tab=${forTab}&exclude=${exclude}`);
        const j = await r.json();
        setNeedsLogin(Boolean(j.needsLogin));
        const next: FeedVideo[] = j.videos ?? [];
        if (replace) {
          setVideos(next);
          setActiveId(next[0]?.id ?? null);
          scroller.current?.scrollTo({ top: 0 });
        } else {
          setVideos((vs) => [...vs, ...next]);
        }
        setDone(next.length === 0);
      } finally {
        setLoading(false);
      }
    },
    [tab, loading, done, videos],
  );

  function switchTab(t: "foryou" | "following") {
    if (t === tab) return;
    setTab(t);
    setDone(false);
    setVideos([]);
    loadMore(true, t);
  }

  // Jump to the requested video when arriving from a shared link.
  useEffect(() => {
    if (!startId) return;
    scroller.current?.querySelector(`[data-vid="${startId}"]`)?.scrollIntoView();
  }, [startId]);

  // Which card is mostly on screen → the one that plays.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.6) setActiveId((e.target as HTMLElement).dataset.vid ?? null);
        }
      },
      { root, threshold: [0.6] },
    );
    root.querySelectorAll("[data-vid]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [videos]);

  // Prefetch when within 3 cards of the end.
  useEffect(() => {
    if (fixed || done || loading) return;
    const i = videos.findIndex((v) => v.id === activeId);
    if (i >= 0 && videos.length - i <= 3) loadMore();
  }, [activeId, videos, fixed, done, loading, loadMore]);

  // Keyboard: ↑/↓ or J/K move between videos, M toggles sound.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable]")) return;
      const step = e.key === "ArrowDown" || e.key === "j" ? 1 : e.key === "ArrowUp" || e.key === "k" ? -1 : 0;
      if (step) {
        e.preventDefault();
        const el = scroller.current;
        if (el) el.scrollBy({ top: step * el.clientHeight, behavior: "smooth" });
      } else if (e.key === "m") setMuted((m) => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggle = useCallback(
    async (v: FeedVideo, what: "like" | "save") => {
      if (!meId) return requireLogin();
      const flag = what === "like" ? "liked" : "saved";
      const before = v[flag];
      patch(v.id, (x) => ({ ...x, [flag]: !before, likes: what === "like" ? x.likes + (before ? -1 : 1) : x.likes }));
      const r = await fetch(`/api/videos/${v.id}/${what}`, { method: "POST" });
      if (!r.ok) patch(v.id, (x) => ({ ...x, [flag]: before, likes: what === "like" ? x.likes + (before ? 1 : -1) : x.likes }));
    },
    [meId, patch, requireLogin],
  );

  const follow = useCallback(
    async (v: FeedVideo) => {
      if (!meId) return requireLogin();
      const was = v.creator.followed;
      const set = (followed: boolean) =>
        setVideos((vs) => vs.map((x) => (x.creator.id === v.creator.id ? { ...x, creator: { ...x.creator, followed } } : x)));
      set(!was);
      const r = await fetch(`/api/users/${v.creator.handle}/follow`, { method: "POST" });
      if (!r.ok) set(was);
    },
    [meId, requireLogin],
  );

  const share = useCallback(
    async (v: FeedVideo) => {
      const url = `${window.location.origin}/v/${v.id}`;
      try {
        if (navigator.share) await navigator.share({ title: v.creator.salonName || v.creator.displayName, text: v.caption, url });
        else {
          await navigator.clipboard.writeText(url);
          return "copied" as const;
        }
        fetch(`/api/videos/${v.id}/share`, { method: "POST" });
        patch(v.id, (x) => ({ ...x, shares: x.shares + 1 }));
      } catch {
        /* user cancelled */
      }
      return "shared" as const;
    },
    [patch],
  );

  const empty = videos.length === 0 && !loading;

  return (
    <div className="relative">
      {tabs && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center pt-3 lg:pt-4">
          <div role="tablist" className="pointer-events-auto flex gap-1 rounded-full bg-black/45 p-1 backdrop-blur-md">
            {(["following", "foryou"] as const).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                onClick={() => switchTab(k)}
                className={`min-h-[40px] cursor-pointer rounded-full px-4 text-sm font-bold transition ${tab === k ? "bg-white text-ink" : "text-white/80 hover:text-white"}`}
              >
                {k === "foryou" ? t("feed.foryou") : t("feed.following")}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="absolute right-3 top-[112px] z-30 lg:hidden"><LanguageSwitcher iconOnly /></div>

      <div ref={scroller} className="snap-feed feed-h" tabIndex={-1}>
        {videos.map((v) => (
          <VideoCard
            key={v.id}
            v={v}
            active={v.id === activeId}
            muted={muted}
            setMuted={setMuted}
            onLike={() => toggle(v, "like")}
            onSave={() => toggle(v, "save")}
            onFollow={() => follow(v)}
            onShare={() => share(v)}
            onComments={() => setCommentsFor(v)}
            isMine={v.creator.id === meId}
          />
        ))}

        {loading && videos.length === 0 && <div className="snap-item grid h-full place-items-center"><div className="skeleton aspect-[9/16] h-[80%] animate-shimmer rounded-3xl" /></div>}

        {empty && (
          <div className="snap-item grid h-full place-items-center px-6 text-center">
            <div>
              <p className="text-lg font-bold">{needsLogin ? t("feed.loginToSee") : tab === "following" ? t("feed.noFollowing") : t("feed.noVideos")}</p>
              <p className="mt-1 text-sm text-mist">{tab === "following" && !needsLogin ? t("feed.followHint") : ""}</p>
              {needsLogin && <Link href="/login?next=/" className="btn btn-primary mt-4">{t("nav.login")}</Link>}
            </div>
          </div>
        )}

        {done && videos.length > 0 && !fixed && (
          <div className="snap-item grid h-full place-items-center px-6 text-center text-mist">{t("feed.end")}</div>
        )}
      </div>

      <CommentsSheet video={commentsFor} meId={meId} onClose={() => setCommentsFor(null)} onPosted={(id) => patch(id, (x) => ({ ...x, comments: x.comments + 1 }))} onNeedLogin={requireLogin} />
    </div>
  );
}

function VideoCard({
  v, active, muted, setMuted, onLike, onSave, onFollow, onShare, onComments, isMine,
}: {
  v: FeedVideo; active: boolean; muted: boolean; setMuted: (f: (m: boolean) => boolean) => void;
  onLike: () => void; onSave: () => void; onFollow: () => void; onShare: () => Promise<"copied" | "shared" | undefined>;
  onComments: () => void; isMine: boolean;
}) {
  const { t, locale } = useI18n();
  const ref = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const counted = useRef(false);
  const lastTap = useRef(0);
  // Respect reduced-motion: do not autoplay, wait for the viewer to press play.
  const [paused, setPaused] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [ready, setReady] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [copied, setCopied] = useState(false);
  const [contain, setContain] = useState(false);

  // Play only the visible card; pause and rewind the rest to save bandwidth/CPU.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active && !paused) {
      el.play().catch(() => {
        /* autoplay blocked: the poster + play icon remain, tap to start */
        setPaused(true);
      });
      if (!counted.current) {
        counted.current = true;
        fetch(`/api/videos/${v.id}/view`, { method: "POST" }).catch(() => {});
      }
    } else {
      el.pause();
      if (!active) {
        el.currentTime = 0;
        setPaused(false);
      }
    }
  }, [active, paused, v.id]);

  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);

  const tags = useMemo(() => v.tags.slice(0, 5), [v.tags]);

  function onTap(e: React.MouseEvent) {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // double tap = like (never un-likes)
      if (!v.liked) onLike();
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const h = { id: now, x: e.clientX - r.left, y: e.clientY - r.top };
      setHearts((hs) => [...hs, h]);
      setTimeout(() => setHearts((hs) => hs.filter((x) => x.id !== h.id)), 800);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    setTimeout(() => {
      if (lastTap.current === now) {
        setPaused((p) => !p);
        lastTap.current = 0;
      }
    }, 300);
  }

  const cta = v.creator.bookingUrl
    ? { href: v.creator.bookingUrl, label: t("card.book"), icon: CalendarCheck, external: true }
    : v.creator.phone
      ? { href: `tel:${v.creator.phone.replace(/[^+\d]/g, "")}`, label: t("card.call"), icon: Phone, external: false }
      : null;

  const rail = "grid size-12 cursor-pointer place-items-center rounded-full bg-white/10 backdrop-blur transition hover:bg-white/20 active:scale-90 lg:bg-white/10";

  return (
    <section data-vid={v.id} dir="ltr" className="snap-item relative flex h-full items-center justify-center lg:py-3" aria-label={t("card.videoOf", { name: v.creator.salonName || v.creator.displayName })}>
      <div className="relative h-full w-full lg:aspect-[9/16] lg:h-full lg:max-h-[920px] lg:w-auto">
        <div className="absolute inset-0 overflow-hidden bg-black lg:rounded-3xl lg:shadow-2xl lg:shadow-black/60">
        <video
          ref={ref}
          src={v.videoUrl}
          poster={v.thumbUrl || undefined}
          loop
          playsInline
          muted
          preload={active ? "auto" : "metadata"}
          onClick={onTap}
          onLoadedData={() => setReady(true)}
          onLoadedMetadata={(e) => setContain(e.currentTarget.videoWidth > e.currentTarget.videoHeight * 1.05)}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            if (bar.current && el.duration) bar.current.style.transform = `scaleX(${el.currentTime / el.duration})`;
          }}
          className={`absolute inset-0 size-full cursor-pointer ${contain ? "object-contain" : "object-cover"}`}
        />
        {!ready && !v.thumbUrl && <div className="skeleton absolute inset-0 animate-shimmer" aria-hidden />}

        {/* Legibility gradient */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

        {paused && active && (
          <button onClick={() => setPaused(false)} aria-label={t("card.play")} className="absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/40 backdrop-blur">
            <Play className="size-9 fill-white" aria-hidden />
          </button>
        )}

        {hearts.map((h) => (
          <Heart key={h.id} aria-hidden style={{ left: h.x - 48, top: h.y - 48 }} className="pointer-events-none absolute size-24 animate-pop fill-glow text-glow drop-shadow-lg" />
        ))}

        <button
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? t("card.unmute") : t("card.mute")}
          className="absolute right-3 top-16 z-10 grid size-10 cursor-pointer place-items-center rounded-full bg-black/40 backdrop-blur transition hover:bg-black/60 lg:top-4"
        >
          {muted ? <VolumeX className="size-5" aria-hidden /> : <Volume2 className="size-5" aria-hidden />}
        </button>

        {isMine && (
          <Link href="/studio" aria-label={t("studio.edit")} className="absolute left-3 top-16 z-10 grid size-10 place-items-center rounded-full bg-black/40 backdrop-blur transition hover:bg-black/60 lg:top-4">
            <Pencil className="size-5" aria-hidden />
          </Link>
        )}

        {/* Info */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-4 pr-[72px] lg:pr-4">
          <Link href={`/u/${v.creator.handle}`} className="inline-flex items-center gap-2 font-bold hover:underline">
            @{v.creator.handle}
          </Link>
          {(v.creator.salonName || v.creator.city) && (
            <p className="mt-0.5 flex items-center gap-1 text-[13px] text-white/80">
              <MapPin className="size-3.5 shrink-0 text-gold" aria-hidden />
              <span className="truncate">{[v.creator.salonName, v.creator.city].filter(Boolean).join(" · ")}</span>
            </p>
          )}
          {v.caption && <p dir="auto" className="mt-2 line-clamp-3 text-[14px] leading-snug text-white/95">{v.caption}</p>}
          {tags.length > 0 && (
            <p className="mt-1 flex flex-wrap gap-x-2 text-[13px] font-semibold">
              {tags.map((t) => <Link key={t} href={`/discover?q=${encodeURIComponent("#" + t)}`} className="text-gold hover:underline">#{t}</Link>)}
            </p>
          )}
          {cta && (
            <a
              href={cta.href}
              {...(cta.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="btn btn-primary mt-3 !min-h-[44px] shadow-lg shadow-glow/30"
            >
              <cta.icon className="size-5" aria-hidden /> {cta.label}
            </a>
          )}
        </div>

        <div aria-hidden className="absolute inset-x-0 bottom-0 z-30 h-[3px] bg-white/15">
          <div ref={bar} className="h-full origin-left bg-glow" style={{ transform: "scaleX(0)" }} />
        </div>
        </div>

        {/* Action rail — inside the card on mobile, beside it on desktop */}
        <div className="absolute bottom-24 right-3 z-20 flex flex-col items-center gap-4 lg:-right-[76px] lg:bottom-4">
          <div className="relative mb-2">
            <Link href={`/u/${v.creator.handle}`} aria-label={t("card.profileOf", { name: v.creator.displayName })}>
              <span className="block rounded-full ring-2 ring-white"><Avatar name={v.creator.displayName} hue={v.creator.hue} url={v.creator.avatarUrl} size={48} /></span>
            </Link>
            {!isMine && (
              <button
                onClick={onFollow}
                aria-label={v.creator.followed ? t("card.unfollow") : t("common.follow")}
                aria-pressed={v.creator.followed}
                className={`absolute -bottom-2 left-1/2 grid size-6 -translate-x-1/2 cursor-pointer place-items-center rounded-full text-white transition ${v.creator.followed ? "bg-white text-ink" : "bg-glow"}`}
              >
                {v.creator.followed ? <Check className="size-4 text-ink" aria-hidden /> : <Plus className="size-4" aria-hidden />}
              </button>
            )}
          </div>

          <Action label={t("card.like")} count={v.likes} locale={locale} onClick={onLike} pressed={v.liked} className={rail}>
            <Heart className={`size-6 transition ${v.liked ? "fill-glow text-glow" : ""}`} aria-hidden />
          </Action>
          <Action label={t("card.comments")} count={v.comments} locale={locale} onClick={onComments} className={rail}>
            <MessageCircle className="size-6" aria-hidden />
          </Action>
          <Action label={t("card.save")} onClick={onSave} pressed={v.saved} className={rail}>
            <Bookmark className={`size-6 ${v.saved ? "fill-gold text-gold" : ""}`} aria-hidden />
          </Action>
          <Action
            label={copied ? t("card.copied") : t("card.share")}
            count={v.shares}
            locale={locale}
            onClick={async () => {
              if ((await onShare()) === "copied") {
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }
            }}
            className={rail}
          >
            {copied ? <Check className="size-6 text-gold" aria-hidden /> : <Share2 className="size-6" aria-hidden />}
          </Action>
          <div className="flex flex-col items-center gap-1">
            <DownloadButton v={v} className={rail} onBusy={(b) => setPaused(b)} />
          </div>
        </div>

      </div>
    </section>
  );
}

function Action({
  label, count, locale, onClick, pressed, className, children,
}: { label: string; count?: number; locale?: string; onClick: () => void; pressed?: boolean; className: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button onClick={onClick} aria-label={label} aria-pressed={pressed} className={className}>{children}</button>
      {count !== undefined && <span className="text-xs font-bold tabular-nums drop-shadow">{compact(count, locale)}</span>}
    </div>
  );
}
