"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Film, ImagePlus, Loader2, UploadCloud, X } from "lucide-react";
import { useT } from "./locale-provider";
import { VideoEditor } from "./video-editor";
import { CategoryPicker } from "./category-picker";
import type { CategorySlug } from "@/lib/categories";

type Meta = { duration: number; width: number; height: number; thumb: Blob | null };
const MAX = 200 * 1024 * 1024;

/** Grab a poster frame ~1s in (or mid-way for short clips) from the chosen file. */
function inspect(url: string): Promise<Meta> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "metadata";
    v.src = url;
    const fail = () => resolve({ duration: 0, width: 0, height: 0, thumb: null });
    v.onerror = fail;
    // Some recorders (and a few phones) write no duration; seeking far past the end makes the browser compute it.
    let fixing = false;
    v.onloadedmetadata = () => {
      if (!Number.isFinite(v.duration)) {
        fixing = true;
        v.ontimeupdate = () => {
          v.ontimeupdate = null;
          fixing = false;
          v.currentTime = Math.min(1, v.duration / 2 || 0);
        };
        v.currentTime = 1e101;
        return;
      }
      v.currentTime = Math.min(1, v.duration / 2 || 0);
    };
    v.onseeked = () => {
      if (fixing) return;
      const scale = Math.min(1, 720 / Math.max(v.videoWidth, 1));
      const c = document.createElement("canvas");
      c.width = Math.round(v.videoWidth * scale);
      c.height = Math.round(v.videoHeight * scale);
      c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
      c.toBlob((b) => resolve({ duration: v.duration, width: v.videoWidth, height: v.videoHeight, thumb: b }), "image/jpeg", 0.82);
    };
  });
}

function put(url: string, blob: Blob, type: string, msgs: { status: (s: number) => string; network: string }, onProgress?: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.setRequestHeader("Content-Type", type);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    x.onload = () => (x.status >= 200 && x.status < 300 ? resolve() : reject(new Error(msgs.status(x.status))));
    x.onerror = () => reject(new Error(msgs.network));
    x.send(blob);
  });
}

export function UploadForm() {
  const router = useRouter();
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [original, setOriginal] = useState<File | null>(null); // the file as chosen, before any in-browser edit
  const [preview, setPreview] = useState("");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<CategorySlug | null>(null);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<"idle" | "uploading" | "saving" | "done">("idle");
  const [error, setError] = useState("");
  // Cover image (poster) — an auto frame by default, a frame the owner scrubs to, or their own picture.
  const [cover, setCover] = useState<Blob | null>(null);
  const [coverUrl, setCoverUrl] = useState("");
  const [frameAt, setFrameAt] = useState(0);
  const grab = useRef<HTMLVideoElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const grabToken = useRef(0);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => { if (coverUrl) URL.revokeObjectURL(coverUrl); }, [coverUrl]);

  function setCoverBlob(b: Blob | null) {
    setCover(b);
    setCoverUrl(b ? URL.createObjectURL(b) : "");
  }

  // The first automatic frame becomes the default cover.
  useEffect(() => {
    if (meta?.thumb) {
      setCoverBlob(meta.thumb);
      setFrameAt(Math.min(1, (meta.duration || 0) / 2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta]);

  /** Capture the frame at second t from the hidden copy of the video. */
  function grabFrame(tSec: number) {
    const v = grab.current;
    if (!v) return;
    const token = ++grabToken.current;
    setFrameAt(tSec);
    const draw = () => {
      if (token !== grabToken.current) return; // a newer slider position superseded this one
      const scale = Math.min(1, 720 / Math.max(v.videoWidth, 1));
      const c = document.createElement("canvas");
      c.width = Math.round(v.videoWidth * scale);
      c.height = Math.round(v.videoHeight * scale);
      c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
      c.toBlob((b) => token === grabToken.current && b && setCoverBlob(b), "image/jpeg", 0.85);
    };
    v.onseeked = draw;
    v.currentTime = tSec;
  }

  function pickCover(f: File | undefined) {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)|| f.size > 5 * 1024 * 1024) return setError(t("err.image"));
    setError("");
    grabToken.current++; // stop any pending frame capture from overwriting the chosen picture
    setCoverBlob(f);
  }

  async function pick(f: File | undefined) {
    setError("");
    if (!f) return;
    if (!/^video\/(mp4|webm|quicktime)$/.test(f.type)) return setError(t("up.errType"));
    if (f.size > MAX) return setError(t("up.errSize"));
    const url = URL.createObjectURL(f);
    setFile(f);
    setOriginal(f);
    setPreview(url);
    setMeta(await inspect(url));
  }

  /** Swap the current clip for another file (an edited render, or the original again). */
  async function useFile(f: File) {
    const url = URL.createObjectURL(f);
    setFile(f);
    setPreview(url);
    setMeta(await inspect(url));
  }

  function applyEdit(blob: Blob) {
    if (blob.size > MAX) return setError(t("up.errSize"));
    useFile(new File([blob], blob.type === "video/mp4" ? "edited.mp4" : "edited.webm", { type: blob.type }));
  }

  async function publish() {
    if (!file) return;
    if (!category) {
      setError(t("cat.required"));
      document.getElementById("category")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setError("");
    setStage("uploading");
    setProgress(0);
    try {
      const thumb = cover;
      const r = await fetch("/api/videos", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoType: file.type, videoSize: file.size, ...(thumb ? { thumbType: thumb.type || "image/jpeg", thumbSize: thumb.size } : {}) }),
      });
      const up = await r.json();
      if (!r.ok) throw new Error(up.error ?? t("up.errStart"));

      const msgs = { status: (status: number) => t("up.errStatus", { status }), network: t("up.errNetwork") };
      if (thumb && up.thumb) await put(up.thumb.url, thumb, thumb.type || "image/jpeg", msgs);
      await put(up.video.url, file, file.type, msgs, setProgress);

      setStage("saving");
      const c = await fetch("/api/videos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoKey: up.videoKey, thumbKey: up.thumb ? up.thumbKey : undefined, mimeType: file.type, caption, category,
          duration: meta?.duration || 0, width: meta?.width || 0, height: meta?.height || 0,
        }),
      });
      const j = await c.json();
      if (!c.ok) throw new Error(j.error ?? t("up.errSave"));
      setStage("done");
      setTimeout(() => { router.push(`/v/${j.id}`); router.refresh(); }, 900);
    } catch (e) {
      setStage("idle");
      setError(e instanceof Error ? e.message : t("up.errGeneric"));
    }
  }

  const busy = stage !== "idle";
  const tooLong = caption.length > 500;

  return (
    <div className="mx-auto grid max-w-4xl gap-8 px-4 pb-28 pt-8 md:grid-cols-[280px_1fr] lg:pb-12">
      <div>
        {file ? (
          <div className="relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-3xl bg-black">
            <video src={preview} muted loop playsInline autoPlay className="size-full object-cover" />
            {!busy && (
              <button onClick={() => { setFile(null); setOriginal(null); setMeta(null); setPreview(""); setCoverBlob(null); }} aria-label={t("up.pickAnother")} className="absolute right-2 top-2 grid size-9 cursor-pointer place-items-center rounded-full bg-black/60 backdrop-blur hover:bg-black/80"><X className="size-5" aria-hidden /></button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
            className={`mx-auto flex aspect-[9/16] w-full max-w-[280px] cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-6 text-center transition ${drag ? "border-glow bg-glow/10" : "border-white/20 bg-ink-2 hover:border-glow/60"}`}
          >
            <UploadCloud className="size-10 text-glow" aria-hidden />
            <span className="font-bold">{t("up.choose")}</span>
            <span className="whitespace-pre-line text-xs text-mist">{t("up.dropHint")}</span>
          </button>
        )}
        {file && <video ref={grab} src={preview} muted playsInline preload="auto" aria-hidden tabIndex={-1} style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />}
        <input ref={input} type="file" accept="video/mp4,video/webm,video/quicktime" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </div>

      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{t("up.title")}</h1>
        <p className="mt-1 text-mist">{t("up.subtitle")}</p>

        <div className="mt-6">
          <CategoryPicker value={category} onChange={setCategory} disabled={busy} />
        </div>

        <div className="mt-6">
          <label htmlFor="cap" className="mb-1.5 flex justify-between text-sm font-semibold">
            <span>{t("up.caption")}</span><span className={`tabular-nums ${tooLong ? "text-red-400" : "text-mist"}`}>{caption.length}/500</span>
          </label>
          <textarea id="cap" rows={5} value={caption} onChange={(e) => setCaption(e.target.value)} disabled={busy}
            placeholder={t("up.captionPlaceholder")} className="input resize-none" />
          <p className="mt-1 text-xs text-mist">{t("up.captionHint")}</p>
        </div>

        {file && (
          <div className="mt-6">
            <p className="mb-1.5 text-sm font-semibold">{t("up.cover")}</p>
            <div className="flex gap-4 rounded-xl bg-ink-2 p-3">
              <div className="aspect-[9/16] w-24 shrink-0 overflow-hidden rounded-lg bg-black">
                {coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverUrl} alt="" className="size-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {meta && Number.isFinite(meta.duration) && meta.duration > 0 && (
                  <>
                    <label htmlFor="frame" className="text-xs text-mist">{t("up.coverFrame")}</label>
                    <input
                      id="frame" type="range" min={0} max={meta.duration} step={0.1} value={frameAt} disabled={busy}
                      onChange={(e) => grabFrame(parseFloat(e.target.value))} className="mt-1 w-full cursor-pointer accent-[#FF4D8D]"
                    />
                  </>
                )}
                <p className="mt-1 text-xs text-mist">{t("up.coverHint")}</p>
                <button type="button" disabled={busy} onClick={() => coverInput.current?.click()} className="btn btn-ghost mt-3 !min-h-[40px] text-sm">
                  <ImagePlus className="size-4" aria-hidden /> {t("up.coverUpload")}
                </button>
                <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { pickCover(e.target.files?.[0]); e.target.value = ""; }} />
              </div>
            </div>
          </div>
        )}

        {file && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-ink-2 p-3 text-sm">
            <Film className="size-5 shrink-0 text-glow" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{file.name}</span>
            <span className="shrink-0 text-mist">{(file.size / 1048576).toFixed(1)}MB{meta?.duration ? ` · ${Math.round(meta.duration)}s` : ""}</span>
          </div>
        )}

        {file && meta && Number.isFinite(meta.duration) && meta.duration > 0 && (
          <>
            <VideoEditor src={preview} duration={meta.duration} disabled={busy} onApply={applyEdit} />
            {original && file !== original && !busy && (
              <button type="button" onClick={() => useFile(original)} className="mt-3 cursor-pointer text-sm font-semibold text-sky-400 underline underline-offset-2 hover:text-sky-300">
                {t("ed.revert")}
              </button>
            )}
          </>
        )}

        {stage === "uploading" && (
          <div className="mt-4" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-glow to-gold transition-[width]" style={{ width: `${progress * 100}%` }} /></div>
            <p className="mt-1 text-xs text-mist">{t("up.progress", { p: Math.round(progress * 100) })}</p>
          </div>
        )}

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

        <button onClick={publish} disabled={!file || busy || tooLong} className="btn btn-primary mt-6 w-full sm:w-auto sm:min-w-[200px]">
          {stage === "done" ? <><CheckCircle2 className="size-5" aria-hidden /> {t("up.done")}</> : busy ? <><Loader2 className="size-5 animate-spin" aria-hidden /> {stage === "saving" ? t("up.saving") : t("up.uploading")}</> : t("up.publish")}
        </button>
      </div>
    </div>
  );
}
