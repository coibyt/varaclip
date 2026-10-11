"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, CameraOff, Check, Copy, Eye, Mic, MicOff, Radio, RefreshCcw, Square } from "lucide-react";
import { ChatPanel } from "./chat-panel";
import { useT } from "./locale-provider";

type Phase = "idle" | "starting" | "live" | "ended";

async function waitForIce(pc: RTCPeerConnection) {
  if (pc.iceGatheringState === "complete") return;
  await new Promise<void>((resolve) => {
    const done = () => {
      pc.removeEventListener("icegatheringstatechange", check);
      resolve();
    };
    const check = () => pc.iceGatheringState === "complete" && done();
    pc.addEventListener("icegatheringstatechange", check);
    setTimeout(done, 2500); // do not wait forever on slow networks
  });
}

const fmtTime = (s: number) => `${Math.floor(s / 3600) ? `${Math.floor(s / 3600)}:` : ""}${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/**
 * The salon goes live straight from the browser: camera -> WebRTC (WHIP) -> Cloudflare Stream.
 * No app and no streaming software needed.
 */
export function Broadcaster({ meId }: { meId: string }) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("idle");
  const [title, setTitle] = useState("");
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [streamId, setStreamId] = useState("");
  const [viewers, setViewers] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [warn, setWarn] = useState("");
  const [copied, setCopied] = useState(false);

  const media = useRef<MediaStream | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const idRef = useRef("");
  idRef.current = streamId;

  const stopMedia = useCallback(() => {
    media.current?.getTracks().forEach((tr) => tr.stop());
    media.current = null;
    if (video.current) video.current.srcObject = null;
    setCamOn(false);
  }, []);

  const openCamera = useCallback(async (face: "user" | "environment") => {
    setError("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: face, width: { ideal: 720 }, height: { ideal: 1280 }, frameRate: { ideal: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      return s;
    } catch {
      setError(t("go.cameraDenied"));
      return null;
    }
  }, [t]);

  async function turnOnCamera() {
    const s = await openCamera(facing);
    if (!s) return;
    media.current = s;
    s.getAudioTracks().forEach((a) => (a.enabled = micOn));
    if (video.current) video.current.srcObject = s;
    setCamOn(true);
  }

  async function flip() {
    const next = facing === "user" ? "environment" : "user";
    const s = await openCamera(next);
    if (!s) return;
    const newVideo = s.getVideoTracks()[0];
    // Keep the live connection: swap the picture on the sender instead of reconnecting.
    const sender = pc.current?.getSenders().find((x) => x.track?.kind === "video");
    if (sender) await sender.replaceTrack(newVideo);
    media.current?.getVideoTracks().forEach((tr) => tr.stop());
    s.getAudioTracks().forEach((a) => a.stop()); // keep the existing microphone
    const audio = media.current?.getAudioTracks() ?? [];
    const merged = new MediaStream([newVideo, ...audio]);
    media.current = merged;
    if (video.current) video.current.srcObject = merged;
    setFacing(next);
  }

  function toggleMic() {
    const on = !micOn;
    media.current?.getAudioTracks().forEach((a) => (a.enabled = on));
    setMicOn(on);
  }

  async function start() {
    if (!media.current) return;
    setError("");
    setWarn("");
    setPhase("starting");
    let id = "";
    try {
      const r = await fetch("/api/live", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? t("go.startFail"));
      id = j.id;
      setStreamId(id);

      const conn = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }], bundlePolicy: "max-bundle" });
      pc.current = conn;
      media.current.getTracks().forEach((tr) => conn.addTransceiver(tr, { direction: "sendonly", streams: [media.current!] }));
      conn.onconnectionstatechange = () => {
        if (conn.connectionState === "failed" || conn.connectionState === "disconnected") setWarn(t("go.connectionLost"));
        else if (conn.connectionState === "connected") setWarn("");
      };
      await conn.setLocalDescription(await conn.createOffer());
      await waitForIce(conn);

      const res = await fetch(j.whipUrl, { method: "POST", headers: { "Content-Type": "application/sdp" }, body: conn.localDescription!.sdp });
      if (!res.ok) throw new Error(t("go.startFail"));
      await conn.setRemoteDescription({ type: "answer", sdp: await res.text() });

      setElapsed(0);
      setPhase("live");
    } catch (e) {
      pc.current?.close();
      pc.current = null;
      if (id) fetch(`/api/live/${id}/end`, { method: "POST" }).catch(() => {});
      setStreamId("");
      setPhase("idle");
      setError(e instanceof Error ? e.message : t("go.startFail"));
    }
  }

  const end = useCallback(async () => {
    const id = idRef.current;
    pc.current?.close();
    pc.current = null;
    stopMedia();
    setPhase("ended");
    if (id) await fetch(`/api/live/${id}/end`, { method: "POST" }).catch(() => {});
  }, [stopMedia]);

  // While live: heartbeat (keeps the stream open + viewer count) and the elapsed clock.
  useEffect(() => {
    if (phase !== "live" || !streamId) return;
    const beat = async () => {
      const r = await fetch(`/api/live/${streamId}/beat`, { method: "POST" }).catch(() => null);
      const j = await r?.json().catch(() => null);
      if (j) { setViewers(j.viewers ?? 0); if (j.status && j.status !== "LIVE") end(); }
    };
    beat();
    const b = setInterval(beat, 20_000);
    const c = setInterval(() => setElapsed((s) => s + 1), 1000);
    const warnUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const closeBeacon = () => navigator.sendBeacon?.(`/api/live/${streamId}/end`);
    window.addEventListener("beforeunload", warnUnload);
    window.addEventListener("pagehide", closeBeacon);
    return () => {
      clearInterval(b); clearInterval(c);
      window.removeEventListener("beforeunload", warnUnload);
      window.removeEventListener("pagehide", closeBeacon);
    };
  }, [phase, streamId, end]);

  useEffect(() => () => { pc.current?.close(); media.current?.getTracks().forEach((tr) => tr.stop()); }, []);

  const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}/live/${streamId}`;

  if (phase === "ended") {
    return (
      <div className="mx-auto max-w-md px-4 pb-28 pt-16 text-center lg:pb-12">
        <h1 className="text-2xl font-extrabold">{t("go.endedTitle")}</h1>
        <p className="mt-2 text-mist">{t("go.endedSub", { time: fmtTime(elapsed) })}</p>
        <Link href="/live" className="btn btn-primary mt-6">{t("nav.live")}</Link>
      </div>
    );
  }

  const live = phase === "live";

  return (
    <div className={`mx-auto grid gap-4 px-4 pb-28 pt-4 lg:pb-8 lg:pt-6 ${live ? "max-w-6xl lg:grid-cols-[minmax(0,1fr)_380px]" : "max-w-xl"}`}>
      <div className="min-w-0">
        <div className="relative mx-auto aspect-[9/16] max-h-[68dvh] w-full max-w-[380px] overflow-hidden rounded-2xl bg-black">
          <video ref={video} autoPlay muted playsInline className={`size-full object-cover ${facing === "user" ? "[transform:scaleX(-1)]" : ""}`} />
          {!camOn && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div>
                <CameraOff className="mx-auto size-10 text-mist" aria-hidden />
                <p className="mt-3 text-sm text-mist">{t("go.cameraOff")}</p>
              </div>
            </div>
          )}
          {live && (
            <div className="absolute left-3 top-3 flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-1 text-xs font-extrabold uppercase"><span className="size-2 animate-pulse rounded-full bg-white" /> {t("live.badge")}</span>
              <span className="rounded-md bg-black/55 px-2 py-1 text-xs font-bold tabular-nums">{fmtTime(elapsed)}</span>
              <span className="flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-xs font-bold tabular-nums"><Eye className="size-3.5" aria-hidden /> {viewers}</span>
            </div>
          )}
          {camOn && (
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-3">
              <button type="button" onClick={toggleMic} aria-pressed={!micOn} aria-label={micOn ? t("go.micOff") : t("go.micOn")} className="grid size-11 cursor-pointer place-items-center rounded-full bg-black/55 backdrop-blur hover:bg-black/75">
                {micOn ? <Mic className="size-5" aria-hidden /> : <MicOff className="size-5 text-red-400" aria-hidden />}
              </button>
              <button type="button" onClick={flip} aria-label={t("go.flip")} className="grid size-11 cursor-pointer place-items-center rounded-full bg-black/55 backdrop-blur hover:bg-black/75"><RefreshCcw className="size-5" aria-hidden /></button>
            </div>
          )}
        </div>

        {warn && <p role="alert" className="mx-auto mt-3 max-w-[380px] rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-300">{warn}</p>}
        {error && <p role="alert" className="mx-auto mt-3 max-w-[380px] rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

        <div className="mx-auto mt-4 max-w-[380px]">
          {!live ? (
            <>
              <h1 className="text-xl font-extrabold">{t("go.title")}</h1>
              <label htmlFor="live-title" className="mb-1.5 mt-4 block text-sm font-semibold">{t("go.titleLabel")}</label>
              <input id="live-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} disabled={phase === "starting"} placeholder={t("go.titlePlaceholder")} className="input" />
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {!camOn ? (
                  <button type="button" onClick={turnOnCamera} className="btn btn-primary flex-1"><Camera className="size-5" aria-hidden /> {t("go.enableCamera")}</button>
                ) : (
                  <button type="button" onClick={start} disabled={phase === "starting"} className="btn btn-primary flex-1">
                    <Radio className="size-5" aria-hidden /> {phase === "starting" ? t("go.starting") : t("go.start")}
                  </button>
                )}
              </div>
              <p className="mt-3 text-xs text-mist">{t("go.tip")}</p>
            </>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt(t("go.share"), shareUrl); }
                }}
                className="btn btn-ghost w-full"
              >
                {copied ? <Check className="size-5 text-gold" aria-hidden /> : <Copy className="size-5" aria-hidden />} {copied ? t("studio.copied") : t("go.share")}
              </button>
              <button type="button" onClick={() => { if (window.confirm(t("go.endConfirm"))) end(); }} className="btn w-full bg-red-600 text-white hover:bg-red-700"><Square className="size-5 fill-white" aria-hidden /> {t("go.end")}</button>
            </div>
          )}
        </div>
      </div>

      {live && streamId && (
        <ChatPanel streamId={streamId} creatorId={meId} meId={meId} isOwner className="h-[52dvh] lg:h-[calc(100dvh-3rem)] lg:max-h-[780px]" />
      )}
    </div>
  );
}
