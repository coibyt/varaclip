"use client";

import { useEffect, useState } from "react";
import { Check, Code2, Copy, Link2, Share2, X } from "lucide-react";
import { useT } from "./locale-provider";
import type { FeedVideo } from "@/lib/util";

type Kind = "link" | "embed";

/**
 * Share sheet opened by the Share button: anyone (visitors included) can copy the video link,
 * which VaraaAi.com accepts in place of a YouTube link, or the embed code for any other website.
 */
export function ShareSheet({ video, onClose, onShared }: { video: FeedVideo | null; onClose: () => void; onShared: (id: string) => void }) {
  const t = useT();
  const [copied, setCopied] = useState<Kind | null>(null);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!video) return;
    setCopied(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [video, onClose]);

  if (!video) return null;
  // Absolute URLs are only known in the browser (the site can sit behind any domain).
  const origin = window.location.origin;
  const values: Record<Kind, string> = {
    link: `${origin}/v/${video.id}`,
    embed: `<iframe src="${origin}/embed/v/${video.id}" width="360" height="640" style="border:0;border-radius:12px;max-width:100%" allow="autoplay; fullscreen" allowfullscreen loading="lazy"></iframe>`,
  };

  function counted() {
    fetch(`/api/videos/${video!.id}/share`, { method: "POST" }).catch(() => {});
    onShared(video!.id);
  }

  async function copy(kind: Kind) {
    try {
      await navigator.clipboard.writeText(values[kind]);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
      counted();
    } catch {
      window.prompt(t(kind === "link" ? "studio.copyLink" : "studio.copyEmbed"), values[kind]);
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: video!.creator.salonName || video!.creator.displayName, text: video!.caption, url: values.link });
      counted();
    } catch {
      /* cancelled */
    }
  }

  const rows: { kind: Kind; icon: typeof Link2; label: string; button: string; multiline: boolean }[] = [
    { kind: "link", icon: Link2, label: t("share.linkLabel"), button: t("studio.copyLink"), multiline: false },
    { kind: "embed", icon: Code2, label: t("share.embedLabel"), button: t("studio.copyEmbed"), multiline: true },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose} role="presentation">
      <div role="dialog" aria-modal="true" aria-label={t("share.title")} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-3xl bg-ink-2 p-5 pb-8 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{t("share.title")}</h2>
          <button type="button" onClick={onClose} aria-label={t("common.close")} className="grid size-10 place-items-center rounded-full hover:bg-white/10"><X className="size-5" aria-hidden /></button>
        </div>

        {canShare && (
          <button type="button" onClick={nativeShare} className="btn btn-primary mt-4 w-full"><Share2 className="size-5" aria-hidden /> {t("share.more")}</button>
        )}

        <div className="mt-4 space-y-4">
          {rows.map((r) => (
            <div key={r.kind}>
              <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold"><r.icon className="size-4 text-mist" aria-hidden /> {r.label}</p>
              <div className="flex gap-2">
                {r.multiline ? (
                  <textarea readOnly rows={3} value={values[r.kind]} onFocus={(e) => e.currentTarget.select()} className="input min-w-0 flex-1 resize-none font-mono !text-xs" />
                ) : (
                  <input readOnly value={values[r.kind]} onFocus={(e) => e.currentTarget.select()} className="input min-w-0 flex-1 !text-sm" />
                )}
                <button type="button" onClick={() => copy(r.kind)} className="btn btn-ghost shrink-0 self-start !px-4">
                  {copied === r.kind ? <Check className="size-5 text-gold" aria-hidden /> : <Copy className="size-5" aria-hidden />}
                  <span className="sr-only sm:not-sr-only">{copied === r.kind ? t("studio.copied") : r.button}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-mist">{t("studio.linkHint")}</p>
      </div>
    </div>
  );
}
