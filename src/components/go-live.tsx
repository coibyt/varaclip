"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Eye, Loader2, Radio, Square } from "lucide-react";
import { ChatPanel } from "./chat-panel";
import { useT } from "./locale-provider";

export type ActiveLive = { id: string; title: string; platform: string; platformName: string; sourceUrl: string };

/**
 * Salon side of a livestream: the salon starts its live on YouTube / Facebook / TikTok,
 * pastes the link here, and then moderates the VaraClip chat from this page.
 */
export function GoLive({ meId, active }: { meId: string; active: ActiveLive | null }) {
  const t = useT();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [viewers, setViewers] = useState(0);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await fetch("/api/live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, url }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setError(j.error ?? t("go.startFail"));
    router.refresh();
  }

  async function end() {
    if (!active || !window.confirm(t("go.endConfirm"))) return;
    setBusy(true);
    await fetch(`/api/live/${active.id}/end`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  if (active) {
    const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}/live/${active.id}`;
    return (
      <div className="mx-auto grid max-w-6xl gap-4 px-4 pb-28 pt-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:pb-8">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-1 text-xs font-extrabold uppercase"><span className="size-2 animate-pulse rounded-full bg-white" /> {t("live.badge")}</span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">{active.title || t("go.liveNow")}</h1>
          <p className="mt-1 flex items-center gap-3 text-sm text-mist">
            <span>{active.platformName}</span>
            <span className="flex items-center gap-1 tabular-nums"><Eye className="size-4" aria-hidden /> {viewers}</span>
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:max-w-sm">
            <Link href={`/live/${active.id}`} className="btn btn-primary"><Radio className="size-5" aria-hidden /> {t("go.open")}</Link>
            <a href={active.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost"><ExternalLink className="size-5" aria-hidden /> {t("live.openOn", { platform: active.platformName })}</a>
            <button
              type="button"
              onClick={async () => { try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt(t("go.share"), shareUrl); } }}
              className="btn btn-ghost"
            >
              {copied ? <Check className="size-5 text-gold" aria-hidden /> : <Copy className="size-5" aria-hidden />} {copied ? t("studio.copied") : t("go.share")}
            </button>
            <button type="button" onClick={end} disabled={busy} className="btn bg-red-600 text-white hover:bg-red-700">
              {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Square className="size-5 fill-white" aria-hidden />} {t("go.end")}
            </button>
          </div>
          <p className="mt-4 text-xs text-mist">{t("go.endHint")}</p>
        </div>

        <ChatPanel streamId={active.id} creatorId={meId} meId={meId} isOwner onUpdate={(u) => setViewers(u.viewers)} className="h-[56dvh] lg:h-[calc(100dvh-3rem)] lg:max-h-[780px]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-28 pt-8 lg:pb-12">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight"><Radio className="size-6 text-red-500" aria-hidden /> {t("go.title")}</h1>

      <div className="mt-5 rounded-2xl bg-ink-2 p-4">
        <p className="font-bold">{t("go.howTitle")}</p>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/85">{t("go.howBody")}</p>
      </div>

      <form onSubmit={start} className="mt-6 space-y-4">
        <div>
          <label htmlFor="live-url" className="mb-1.5 block text-sm font-semibold">{t("go.linkLabel")}</label>
          <input
            id="live-url" type="url" inputMode="url" required value={url} onChange={(e) => setUrl(e.target.value)} disabled={busy}
            placeholder="https://www.youtube.com/watch?v=…" className="input" autoComplete="off"
          />
          <p className="mt-1 text-xs text-mist">{t("go.linkHint")}</p>
        </div>
        <div>
          <label htmlFor="live-title" className="mb-1.5 block text-sm font-semibold">{t("go.titleLabel")}</label>
          <input id="live-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} disabled={busy} placeholder={t("go.titlePlaceholder")} className="input" />
        </div>

        {error && <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

        <button disabled={busy || url.trim().length < 8} className="btn btn-primary w-full">
          {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Radio className="size-5" aria-hidden />} {busy ? t("go.starting") : t("go.start")}
        </button>
        <p className="text-xs text-mist">{t("go.tiktokNote")}</p>
      </form>
    </div>
  );
}
