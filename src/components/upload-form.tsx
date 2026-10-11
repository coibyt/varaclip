"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Film, Loader2, UploadCloud, X } from "lucide-react";

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
    v.onloadedmetadata = () => {
      v.currentTime = Math.min(1, v.duration / 2 || 0);
    };
    v.onseeked = () => {
      const scale = Math.min(1, 720 / Math.max(v.videoWidth, 1));
      const c = document.createElement("canvas");
      c.width = Math.round(v.videoWidth * scale);
      c.height = Math.round(v.videoHeight * scale);
      c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
      c.toBlob((b) => resolve({ duration: v.duration, width: v.videoWidth, height: v.videoHeight, thumb: b }), "image/jpeg", 0.82);
    };
  });
}

function put(url: string, blob: Blob, type: string, onProgress?: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.setRequestHeader("Content-Type", type);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    x.onload = () => (x.status >= 200 && x.status < 300 ? resolve() : reject(new Error(`Tải lên thất bại (${x.status}).`)));
    x.onerror = () => reject(new Error("Mất kết nối khi tải lên. Vui lòng thử lại."));
    x.send(blob);
  });
}

export function UploadForm() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [caption, setCaption] = useState("");
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<"idle" | "uploading" | "saving" | "done">("idle");
  const [error, setError] = useState("");

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function pick(f: File | undefined) {
    setError("");
    if (!f) return;
    if (!/^video\/(mp4|webm|quicktime)$/.test(f.type)) return setError("Chỉ hỗ trợ video MP4, WebM hoặc MOV.");
    if (f.size > MAX) return setError("Video tối đa 200MB.");
    const url = URL.createObjectURL(f);
    setFile(f);
    setPreview(url);
    setMeta(await inspect(url));
  }

  async function publish() {
    if (!file) return;
    setError("");
    setStage("uploading");
    setProgress(0);
    try {
      const thumb = meta?.thumb;
      const r = await fetch("/api/videos", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoType: file.type, videoSize: file.size, ...(thumb ? { thumbType: "image/jpeg", thumbSize: thumb.size } : {}) }),
      });
      const t = await r.json();
      if (!r.ok) throw new Error(t.error ?? "Không thể bắt đầu tải lên.");

      if (thumb && t.thumb) await put(t.thumb.url, thumb, "image/jpeg");
      await put(t.video.url, file, file.type, setProgress);

      setStage("saving");
      const c = await fetch("/api/videos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoKey: t.videoKey, thumbKey: t.thumb ? t.thumbKey : undefined, mimeType: file.type, caption,
          duration: meta?.duration || 0, width: meta?.width || 0, height: meta?.height || 0,
        }),
      });
      const j = await c.json();
      if (!c.ok) throw new Error(j.error ?? "Không lưu được video.");
      setStage("done");
      setTimeout(() => { router.push(`/v/${j.id}`); router.refresh(); }, 900);
    } catch (e) {
      setStage("idle");
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra.");
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
              <button onClick={() => { setFile(null); setMeta(null); setPreview(""); }} aria-label="Chọn video khác" className="absolute right-2 top-2 grid size-9 cursor-pointer place-items-center rounded-full bg-black/60 backdrop-blur hover:bg-black/80"><X className="size-5" aria-hidden /></button>
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
            <span className="font-bold">Chọn video để tải lên</span>
            <span className="text-xs text-mist">hoặc kéo thả vào đây<br />MP4, WebM, MOV · tối đa 200MB<br />Tỉ lệ dọc 9:16 là đẹp nhất</span>
          </button>
        )}
        <input ref={input} type="file" accept="video/mp4,video/webm,video/quicktime" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </div>

      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Đăng video mới</h1>
        <p className="mt-1 text-mist">Chia sẻ kết quả làm đẹp của khách hàng — nhớ xin phép khách trước khi đăng.</p>

        <div className="mt-6">
          <label htmlFor="cap" className="mb-1.5 flex justify-between text-sm font-semibold">
            <span>Mô tả</span><span className={`tabular-nums ${tooLong ? "text-red-400" : "text-mist"}`}>{caption.length}/500</span>
          </label>
          <textarea id="cap" rows={5} value={caption} onChange={(e) => setCaption(e.target.value)} disabled={busy}
            placeholder="Balayage tro khói cho khách ✨ #toc #balayage #nail" className="input resize-none" />
          <p className="mt-1 text-xs text-mist">Thêm #hashtag để khách dễ tìm thấy video của bạn.</p>
        </div>

        {file && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-ink-2 p-3 text-sm">
            <Film className="size-5 shrink-0 text-glow" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{file.name}</span>
            <span className="shrink-0 text-mist">{(file.size / 1048576).toFixed(1)}MB{meta?.duration ? ` · ${Math.round(meta.duration)}s` : ""}</span>
          </div>
        )}

        {stage === "uploading" && (
          <div className="mt-4" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-glow to-gold transition-[width]" style={{ width: `${progress * 100}%` }} /></div>
            <p className="mt-1 text-xs text-mist">Đang tải lên… {Math.round(progress * 100)}%</p>
          </div>
        )}

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

        <button onClick={publish} disabled={!file || busy || tooLong} className="btn btn-primary mt-6 w-full sm:w-auto sm:min-w-[200px]">
          {stage === "done" ? <><CheckCircle2 className="size-5" aria-hidden /> Đã đăng!</> : busy ? <><Loader2 className="size-5 animate-spin" aria-hidden /> {stage === "saving" ? "Đang lưu…" : "Đang tải lên…"}</> : "Đăng video"}
        </button>
      </div>
    </div>
  );
}
