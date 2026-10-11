"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Music, Pause, Play, Plus, Scissors, Trash2, Type, X } from "lucide-react";
import {
  FILTERS, SPEEDS, defaultSettings, drawFrame, editorSupported, filterSupported, renderEdited,
  type EditSettings, type FilterId, type RenderControl, type TextItem, type TextPos,
} from "@/lib/video-edit";
import { useT } from "./locale-provider";

const FILTER_IDS = Object.keys(FILTERS) as FilterId[];
const POSITIONS: TextPos[] = ["top", "middle", "bottom"];
const COLORS = ["#FFFFFF", "#FFE066", "#FF4D8D", "#7DF9FF", "#9BFF9B", "#000000"];
const MAX_MUSIC = 20 * 1024 * 1024;

const fmt = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;

type Props = { src: string; duration: number; disabled?: boolean; onApply: (blob: Blob) => void };

export function VideoEditor({ src, duration, disabled, onApply }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<EditSettings>(() => defaultSettings(duration));
  const [playing, setPlaying] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const musicEl = useRef<HTMLAudioElement | null>(null);
  const ctl = useRef<RenderControl>({ cancelled: false });
  const live = useRef(s); // latest settings for the animation loop
  live.current = s;
  const canFilter = filterSupported();

  // New source video (after applying an edit or choosing another file): start over.
  useEffect(() => {
    setS(defaultSettings(duration));
    setPlaying(false);
  }, [src, duration]);

  // Music element for the preview.
  useEffect(() => {
    musicEl.current?.pause();
    musicEl.current = null;
    if (!s.music) return;
    const url = URL.createObjectURL(s.music);
    const a = new Audio(url);
    a.loop = true;
    musicEl.current = a;
    return () => { a.pause(); URL.revokeObjectURL(url); };
  }, [s.music]);

  useEffect(() => { if (musicEl.current) musicEl.current.volume = s.musicVol; }, [s.musicVol, s.music]);
  useEffect(() => { if (video.current) { video.current.volume = s.origVol; video.current.playbackRate = s.speed; } }, [s.origVol, s.speed, open]);

  // Preview loop: draws the edited frame; wraps playback inside the trimmed range.
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const tick = () => {
      const v = video.current, c = canvas.current;
      if (v && c && v.videoWidth) {
        if (c.width !== 360) { c.width = 360; c.height = Math.round((360 * v.videoHeight) / v.videoWidth); }
        const cur = live.current;
        if (!v.paused && (v.currentTime >= cur.end || v.ended)) {
          v.currentTime = cur.start;
          if (musicEl.current) musicEl.current.currentTime = 0;
          if (v.ended) v.play().catch(() => {});
        }
        const ctx = c.getContext("2d");
        if (ctx) drawFrame(ctx, v, c.width, c.height, cur);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (!open) { video.current?.pause(); musicEl.current?.pause(); setPlaying(false); }
  }, [open]);

  const seek = useCallback((sec: number) => {
    if (video.current) video.current.currentTime = sec;
  }, []);

  function togglePlay() {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime < s.start || v.currentTime >= s.end) v.currentTime = s.start;
      v.play().catch(() => {});
      musicEl.current?.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      musicEl.current?.pause();
      setPlaying(false);
    }
  }

  const set = <K extends keyof EditSettings>(k: K, v: EditSettings[K]) => setS((o) => ({ ...o, [k]: v }));
  const updateText = (id: number, patch: Partial<TextItem>) => set("texts", s.texts.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const outLen = Math.max(0, (s.end - s.start) / s.speed);

  async function apply() {
    setError("");
    setRendering(true);
    setProgress(0);
    ctl.current = { cancelled: false };
    video.current?.pause();
    musicEl.current?.pause();
    setPlaying(false);
    try {
      const blob = await renderEdited(src, s, setProgress, ctl.current);
      if (blob.size === 0) throw new Error("empty");
      onApply(blob);
      setOpen(false);
    } catch (e) {
      if (!(e instanceof Error && e.message === "cancelled")) setError(t("ed.fail"));
    } finally {
      setRendering(false);
    }
  }

  if (!editorSupported()) return <p className="mt-6 rounded-xl bg-ink-2 p-3 text-sm text-mist">{t("ed.unsupported")}</p>;

  const chip = (on: boolean) =>
    `min-h-[40px] cursor-pointer rounded-full border px-3.5 text-sm font-semibold transition ${on ? "border-glow bg-glow/15 text-glow" : "border-white/10 bg-ink-3 text-white hover:border-white/30"}`;
  const section = "mt-5";
  const label = "mb-2 flex items-center gap-2 text-sm font-semibold";

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-ink-2">
      <button
        type="button" onClick={() => setOpen((o) => !o)} disabled={disabled || rendering} aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 p-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-glow to-gold text-ink"><Scissors className="size-5" aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{t("ed.title")}</span>
          <span className="block text-xs text-mist">{t("ed.hint")}</span>
        </span>
      </button>

      {/* The source video stays mounted (off-screen) so the preview canvas always has frames to draw. */}
      <video ref={video} src={src} playsInline preload="auto" aria-hidden tabIndex={-1} style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />

      {open && (
        <div className="border-t border-white/10 p-4">
          <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
            <div>
              <div className="relative mx-auto aspect-[9/16] w-full max-w-[180px] overflow-hidden rounded-xl bg-black">
                <canvas ref={canvas} className="size-full object-cover" aria-label={t("ed.preview")} />
                <button type="button" onClick={togglePlay} disabled={rendering} aria-label={t("ed.playPause")} className="absolute inset-x-0 bottom-2 mx-auto grid size-10 cursor-pointer place-items-center rounded-full bg-black/55 backdrop-blur hover:bg-black/75">
                  {playing ? <Pause className="size-5" aria-hidden /> : <Play className="size-5 fill-white" aria-hidden />}
                </button>
              </div>
              <p className="mt-2 text-center text-xs text-mist">{t("ed.length", { s: outLen.toFixed(1) })}</p>
            </div>

            <div className="min-w-0">
              {/* Trim */}
              <div>
                <p className={label}><Scissors className="size-4 text-glow" aria-hidden /> {t("ed.trim")}</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 text-xs text-mist">
                    <span className="w-20 shrink-0">{t("ed.start")} · {fmt(s.start)}</span>
                    <input type="range" min={0} max={duration} step={0.1} value={s.start} disabled={rendering}
                      onChange={(e) => { const v = Math.min(parseFloat(e.target.value), s.end - 0.5); set("start", Math.max(0, v)); seek(Math.max(0, v)); }}
                      className="w-full cursor-pointer accent-[#FF4D8D]" />
                  </label>
                  <label className="flex items-center gap-3 text-xs text-mist">
                    <span className="w-20 shrink-0">{t("ed.end")} · {fmt(s.end)}</span>
                    <input type="range" min={0} max={duration} step={0.1} value={s.end} disabled={rendering}
                      onChange={(e) => { const v = Math.max(parseFloat(e.target.value), s.start + 0.5); set("end", Math.min(duration, v)); seek(Math.min(duration, v) - 0.05); }}
                      className="w-full cursor-pointer accent-[#FF4D8D]" />
                  </label>
                </div>
              </div>

              {/* Speed */}
              <div className={section}>
                <p className={label}>{t("ed.speed")}</p>
                <div className="flex flex-wrap gap-2">
                  {SPEEDS.map((sp) => (
                    <button key={sp} type="button" aria-pressed={s.speed === sp} disabled={rendering} onClick={() => set("speed", sp)} className={chip(s.speed === sp)}>{sp}×</button>
                  ))}
                </div>
              </div>

              {/* Effects */}
              {canFilter && (
                <div className={section}>
                  <p className={label}>{t("ed.effects")}</p>
                  <div className="flex flex-wrap gap-2">
                    {FILTER_IDS.map((f) => (
                      <button key={f} type="button" aria-pressed={s.filter === f} disabled={rendering} onClick={() => set("filter", f)} className={chip(s.filter === f)}>{t(`ed.fx.${f}`)}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Music */}
              <div className={section}>
                <p className={label}><Music className="size-4 text-glow" aria-hidden /> {t("ed.music")}</p>
                {s.music ? (
                  <div className="flex items-center gap-2 rounded-xl bg-ink-3 p-2 text-sm">
                    <span className="min-w-0 flex-1 truncate px-1">{s.music.name}</span>
                    <button type="button" onClick={() => set("music", null)} disabled={rendering} aria-label={t("ed.removeMusic")} className="grid size-9 cursor-pointer place-items-center rounded-full text-mist hover:bg-white/10 hover:text-white"><X className="size-4" aria-hidden /></button>
                  </div>
                ) : (
                  <label className="btn btn-ghost !min-h-[40px] cursor-pointer text-sm">
                    <Music className="size-4" aria-hidden /> {t("ed.addMusic")}
                    <input
                      type="file" accept="audio/*" className="sr-only" disabled={rendering}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (!f) return;
                        if (f.size > MAX_MUSIC) return setError(t("ed.musicTooBig"));
                        setError("");
                        set("music", f);
                      }}
                    />
                  </label>
                )}
                <p className="mt-1 text-xs text-mist">{t("ed.musicNote")}</p>
                <div className="mt-2 space-y-2">
                  {s.music && (
                    <label className="flex items-center gap-3 text-xs text-mist">
                      <span className="w-28 shrink-0">{t("ed.musicVol")}</span>
                      <input type="range" min={0} max={1} step={0.05} value={s.musicVol} onChange={(e) => set("musicVol", parseFloat(e.target.value))} className="w-full cursor-pointer accent-[#FF4D8D]" />
                    </label>
                  )}
                  <label className="flex items-center gap-3 text-xs text-mist">
                    <span className="w-28 shrink-0">{t("ed.origVol")}</span>
                    <input type="range" min={0} max={1} step={0.05} value={s.origVol} onChange={(e) => set("origVol", parseFloat(e.target.value))} className="w-full cursor-pointer accent-[#FF4D8D]" />
                  </label>
                </div>
              </div>

              {/* Text */}
              <div className={section}>
                <p className={label}><Type className="size-4 text-glow" aria-hidden /> {t("ed.text")}</p>
                <div className="space-y-3">
                  {s.texts.map((it) => (
                    <div key={it.id} className="rounded-xl bg-ink-3 p-3">
                      <div className="flex items-start gap-2">
                        <textarea
                          rows={2} maxLength={120} value={it.text} placeholder={t("ed.textPlaceholder")} disabled={rendering}
                          onChange={(e) => updateText(it.id, { text: e.target.value })} className="input resize-none !py-2 text-sm"
                        />
                        <button type="button" onClick={() => set("texts", s.texts.filter((x) => x.id !== it.id))} disabled={rendering} aria-label={t("ed.remove")} className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-mist hover:bg-red-500/15 hover:text-red-400"><Trash2 className="size-4" aria-hidden /></button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {POSITIONS.map((p) => (
                          <button key={p} type="button" aria-pressed={it.pos === p} onClick={() => updateText(it.id, { pos: p })} className={chip(it.pos === p)}>{t(`ed.pos.${p}`)}</button>
                        ))}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label={t("ed.color")}>
                        {COLORS.map((c) => (
                          <button
                            key={c} type="button" onClick={() => updateText(it.id, { color: c })} aria-label={c} aria-pressed={it.color === c}
                            className={`size-8 cursor-pointer rounded-full border-2 ${it.color === c ? "border-glow" : "border-white/25"}`} style={{ background: c }}
                          />
                        ))}
                      </div>
                      <label className="mt-2 flex items-center gap-3 text-xs text-mist">
                        <span className="w-20 shrink-0">{t("ed.size")}</span>
                        <input type="range" min={3} max={12} step={0.5} value={it.size} onChange={(e) => updateText(it.id, { size: parseFloat(e.target.value) })} className="w-full cursor-pointer accent-[#FF4D8D]" />
                      </label>
                    </div>
                  ))}
                  {s.texts.length < 5 && (
                    <button
                      type="button" disabled={rendering}
                      onClick={() => set("texts", [...s.texts, { id: Date.now(), text: "", pos: "bottom", color: "#FFFFFF", size: 6 }])}
                      className="btn btn-ghost !min-h-[40px] text-sm"
                    >
                      <Plus className="size-4" aria-hidden /> {t("ed.addText")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {error && <p role="alert" className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

          {rendering ? (
            <div className="mt-5" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-glow to-gold transition-[width]" style={{ width: `${progress * 100}%` }} /></div>
              <p className="mt-1 flex items-center gap-2 text-xs text-mist"><Loader2 className="size-3.5 animate-spin" aria-hidden /> {t("ed.rendering", { p: Math.round(progress * 100) })}</p>
              <p className="mt-1 text-xs text-gold">{t("ed.keepOpen")}</p>
              <button type="button" onClick={() => { ctl.current.cancelled = true; }} className="btn btn-ghost mt-3 !min-h-[40px] text-sm">{t("ed.cancel")}</button>
            </div>
          ) : (
            <button type="button" onClick={apply} disabled={disabled || outLen < 0.5} className="btn btn-primary mt-5">{t("ed.apply")}</button>
          )}
        </div>
      )}
    </div>
  );
}
