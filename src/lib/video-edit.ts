/**
 * In-browser video editing: trim, speed, music, colour effects and text.
 *
 * No server work and no ffmpeg download: the clip is played back in a hidden
 * <video>, every frame is drawn on a canvas (with the effect and the texts),
 * the sound is mixed with the Web Audio API and the result is re-recorded with
 * MediaRecorder. Export therefore takes about as long as the edited clip.
 */

export type FilterId = "none" | "warm" | "cool" | "bw" | "vintage" | "vivid" | "soft";
export type TextPos = "top" | "middle" | "bottom";

export type TextItem = { id: number; text: string; pos: TextPos; color: string; size: number };

export type EditSettings = {
  start: number;
  end: number;
  speed: number;
  filter: FilterId;
  texts: TextItem[];
  music: File | null;
  musicVol: number; // 0..1
  origVol: number; // 0..1
};

export const FILTERS: Record<FilterId, string> = {
  none: "none",
  warm: "sepia(0.25) saturate(1.3) brightness(1.05)",
  cool: "hue-rotate(-12deg) saturate(1.15) contrast(1.05) brightness(1.03)",
  bw: "grayscale(1) contrast(1.1)",
  vintage: "sepia(0.6) contrast(0.95) brightness(1.05) saturate(1.2)",
  vivid: "saturate(1.6) contrast(1.1)",
  soft: "brightness(1.1) saturate(1.15) contrast(0.92)",
};

export const SPEEDS = [0.5, 0.75, 1, 1.5, 2];

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif';
const Y: Record<TextPos, number> = { top: 0.14, middle: 0.5, bottom: 0.82 };

export const defaultSettings = (duration: number): EditSettings => ({
  start: 0, end: duration, speed: 1, filter: "none", texts: [], music: null, musicVol: 0.6, origVol: 1,
});

/** Does this browser support everything the editor needs? */
export function editorSupported() {
  if (typeof window === "undefined") return false;
  return typeof MediaRecorder !== "undefined" && "captureStream" in HTMLCanvasElement.prototype;
}

export function filterSupported() {
  if (typeof document === "undefined") return false;
  return "filter" in document.createElement("canvas").getContext("2d")!;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    // Split on spaces; very long words (or languages without spaces) are broken by character.
    for (const word of para.split(/(\s+)/)) {
      const test = line + word;
      if (ctx.measureText(test).width <= maxW || !line) {
        if (ctx.measureText(test).width > maxW) {
          for (const ch of word) {
            if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ""; }
            line += ch;
          }
        } else line = test;
      } else {
        out.push(line.trimEnd());
        line = word.trimStart();
      }
    }
    out.push(line.trimEnd());
  }
  return out.filter((l, i) => l || i === 0);
}

/** Draw one edited frame: the video image with the colour effect, then the texts. */
export function drawFrame(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, W: number, H: number, s: EditSettings) {
  ctx.filter = FILTERS[s.filter] ?? "none";
  ctx.drawImage(video, 0, 0, W, H);
  ctx.filter = "none";

  for (const item of s.texts) {
    if (!item.text.trim()) continue;
    const px = Math.round((W * item.size) / 100);
    ctx.font = `700 ${px}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(2, px * 0.16);
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.fillStyle = item.color;
    const lines = wrap(ctx, item.text, W * 0.88);
    const lh = px * 1.2;
    const y0 = H * Y[item.pos] - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => {
      ctx.strokeText(l, W / 2, y0 + i * lh);
      ctx.fillText(l, W / 2, y0 + i * lh);
    });
  }
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

function pickMime() {
  const candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  const found = candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
  return { mime: found, base: found.startsWith("video/mp4") ? "video/mp4" : "video/webm" };
}

const once = (el: HTMLMediaElement, ev: string) => new Promise<void>((res, rej) => {
  el.addEventListener(ev, () => res(), { once: true });
  el.addEventListener("error", () => rej(new Error("media error")), { once: true });
});

export type RenderControl = { cancelled: boolean };

/** Render the edited clip. Resolves with a Blob whose type is exactly video/mp4 or video/webm. */
export type RenderOptions = {
  /** Set to "anonymous" when the video lives on another origin (needs CORS headers there, or the canvas is tainted). */
  crossOrigin?: "anonymous";
  /** Drawn on top of every frame (used for the VaraClip watermark on downloads). */
  overlay?: (ctx: CanvasRenderingContext2D, W: number, H: number) => void;
};

/** s.end <= 0 means "until the video ends". */
export async function renderEdited(src: string, s: EditSettings, onProgress: (p: number) => void, ctl: RenderControl, opts: RenderOptions = {}): Promise<Blob> {
  const video = document.createElement("video");
  if (opts.crossOrigin) video.crossOrigin = opts.crossOrigin;
  video.src = src;
  video.playsInline = true;
  video.preload = "auto";
  await once(video, "loadedmetadata");

  const W = even(Math.min(720, video.videoWidth));
  const H = even((W * video.videoHeight) / video.videoWidth);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ac = new AC();
  await ac.resume();
  const dest = ac.createMediaStreamDestination();
  const vSrc = ac.createMediaElementSource(video);
  const vGain = ac.createGain();
  vGain.gain.value = s.origVol;
  vSrc.connect(vGain).connect(dest);

  let music: HTMLAudioElement | null = null;
  let musicUrl = "";
  if (s.music) {
    musicUrl = URL.createObjectURL(s.music);
    music = new Audio(musicUrl);
    music.loop = true;
    const mSrc = ac.createMediaElementSource(music);
    const mGain = ac.createGain();
    mGain.gain.value = s.musicVol;
    mSrc.connect(mGain).connect(dest);
  }

  const stream = canvas.captureStream(30);
  dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  const { mime, base } = pickMime();
  const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 3_000_000, audioBitsPerSecond: 128_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise<void>((res) => (rec.onstop = () => res()));

  const end = s.end > 0 ? s.end : Number.isFinite(video.duration) ? video.duration : 1e9;
  video.currentTime = s.start;
  await once(video, "seeked");
  video.playbackRate = s.speed;
  drawFrame(ctx, video, W, H, s);
  opts.overlay?.(ctx, W, H);
  rec.start(250);
  await video.play();
  music?.play().catch(() => {});

  // Drive the render with requestAnimationFrame while the page is visible and with a timer as a fallback
  // (browsers pause animation frames in hidden tabs). A watchdog aborts if the video stops advancing.
  let stalled = false;
  await new Promise<void>((resolve) => {
    let done = false;
    let lastTime = video.currentTime;
    let lastMove = performance.now();
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(timer);
      resolve();
    };
    const step = () => {
      if (done) return;
      drawFrame(ctx, video, W, H, s);
      opts.overlay?.(ctx, W, H);
      const span = Math.max(0.1, (Number.isFinite(video.duration) ? Math.min(end, video.duration) : end) - s.start);
      onProgress(Math.min(1, Math.max(0, (video.currentTime - s.start) / span)));
      if (ctl.cancelled || video.ended || video.currentTime >= end - 0.03) finish();
    };
    const frame = () => {
      if (done) return;
      step();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    const timer = setInterval(() => {
      step();
      const now = performance.now();
      if (video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        lastMove = now;
      } else if (now - lastMove > 20000) {
        stalled = true;
        finish();
      }
    }, 200);
  });

  video.pause();
  music?.pause();
  rec.stop();
  await stopped;
  stream.getTracks().forEach((t) => t.stop());
  ac.close().catch(() => {});
  if (musicUrl) URL.revokeObjectURL(musicUrl);
  if (ctl.cancelled) throw new Error("cancelled");
  if (stalled) throw new Error("stalled");
  return new Blob(chunks, { type: base });
}
