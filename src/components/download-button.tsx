"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { defaultSettings, editorSupported, renderEdited, type RenderControl } from "@/lib/video-edit";
import { makeWatermark } from "@/lib/watermark";
import type { FeedVideo } from "@/lib/util";
import { useT } from "./locale-provider";

const slug = (s: string) => s.normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "video";

/**
 * Saves a copy of the video with the VaraClip logo and the salon name burned in.
 * The copy is rendered in the visitor's own browser, so the player on the site stays clean.
 */
export function DownloadButton({ v, className, onBusy }: { v: FeedVideo; className: string; onBusy: (busy: boolean) => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [ctl, setCtl] = useState<RenderControl>({ cancelled: false });

  async function run() {
    if (!editorSupported()) return setError(t("dl.unsupported"));
    const control: RenderControl = { cancelled: false };
    setCtl(control);
    setError("");
    setProgress(0);
    setBusy(true);
    onBusy(true);
    try {
      const fontFamily = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "Georgia";
      await document.fonts.load(`700 34px ${fontFamily}`).catch(() => []);
      const overlay = makeWatermark({ name: v.creator.salonName || v.creator.displayName, handle: v.creator.handle, fontFamily });
      const settings = { ...defaultSettings(0), end: 0 };

      let blob: Blob;
      try {
        // Direct from storage when it sends CORS headers (no traffic through our server) ...
        blob = await renderEdited(v.videoUrl, settings, setProgress, control, { crossOrigin: "anonymous", overlay });
      } catch (e) {
        if (control.cancelled) throw e;
        // ... otherwise through our same-origin copy.
        blob = await renderEdited(`/api/videos/${v.id}/source`, settings, setProgress, control, { overlay });
      }
      if (blob.size === 0) throw new Error("empty");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug(v.creator.salonName || v.creator.displayName)}-varaclip.${blob.type === "video/mp4" ? "mp4" : "webm"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      if (!(e instanceof Error && e.message === "cancelled")) setError(t("dl.fail"));
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={run} disabled={busy} aria-label={t("dl.download")} className={className}>
        {busy ? <Loader2 className="size-6 animate-spin" aria-hidden /> : <Download className="size-6" aria-hidden />}
      </button>

      {(busy || error) && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={t("dl.download")}>
          <div className="w-full max-w-sm rounded-2xl bg-ink-2 p-5 text-center">
            {busy ? (
              <div role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                <Loader2 className="mx-auto size-7 animate-spin text-glow" aria-hidden />
                <p className="mt-3 text-sm font-semibold">{t("dl.preparing", { p: Math.round(progress * 100) })}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-glow to-gold transition-[width]" style={{ width: `${progress * 100}%` }} /></div>
                <p className="mt-3 text-xs text-gold">{t("ed.keepOpen")}</p>
                <button type="button" onClick={() => { ctl.cancelled = true; }} className="btn btn-ghost mt-4 !min-h-[40px] text-sm">{t("ed.cancel")}</button>
              </div>
            ) : (
              <>
                <p role="alert" className="text-sm text-red-300">{error}</p>
                <button type="button" onClick={() => setError("")} className="btn btn-ghost mt-4 !min-h-[40px] text-sm">{t("common.close")}</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
