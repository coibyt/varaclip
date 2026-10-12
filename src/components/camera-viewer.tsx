"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { useT } from "./locale-provider";

type Sig = { seq: number; from: string; data: { sdp?: RTCSessionDescriptionInit; ice?: RTCIceCandidateInit } };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const JSON_HEADERS = { "Content-Type": "application/json" };
const GIVE_UP_MS = 30_000;
const REJOIN_MS = 8_000;

function newKey() {
  const a = new Uint8Array(10);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => (b % 36).toString(36)).join("");
}

/** Viewer side: asks the salon's browser for the stream and plays it. */
export function CameraViewer({ streamId }: { streamId: string }) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"connecting" | "playing" | "failed">("connecting");
  const [muted, setMuted] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setState("connecting");
    let stop = false;
    let seq = 0;
    let connected = false;
    let ice: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
    let pc: RTCPeerConnection | null = null;
    let queued: RTCIceCandidateInit[] = [];
    const me = newKey();

    const post = (data: object) =>
      fetch(`/api/live/${streamId}/signal`, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ from: me, to: "host", data }) }).catch(() => {});

    function fresh() {
      pc?.close();
      const p = new RTCPeerConnection({ iceServers: ice });
      pc = p;
      p.ontrack = (e) => {
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = e.streams[0];
        v.play().catch(() => {});
      };
      p.onicecandidate = (e) => { if (e.candidate) void post({ ice: e.candidate.toJSON() }); };
      p.onconnectionstatechange = () => {
        if (p.connectionState === "connected") { connected = true; setState("playing"); }
        else if (p.connectionState === "failed" || p.connectionState === "closed") { connected = false; if (!stop) setState("failed"); }
      };
      return p;
    }

    async function handle(m: Sig) {
      if (m.data.sdp) {
        const p = fresh();
        await p.setRemoteDescription(m.data.sdp);
        for (const c of queued) await p.addIceCandidate(c).catch(() => {});
        queued = [];
        await p.setLocalDescription(await p.createAnswer());
        await post({ sdp: p.localDescription });
      } else if (m.data.ice) {
        if (pc?.remoteDescription) await pc.addIceCandidate(m.data.ice).catch(() => {});
        else queued.push(m.data.ice);
      }
    }

    (async () => {
      const started = Date.now();
      let lastJoin = 0;
      while (!stop && !connected) {
        if (Date.now() - started > GIVE_UP_MS) { setState("failed"); return; }
        if (Date.now() - lastJoin > REJOIN_MS) { lastJoin = Date.now(); await post({ join: true }); }
        try {
          const r = await fetch(`/api/live/${streamId}/signal?key=${me}&after=${seq}`, { cache: "no-store" });
          if (r.ok) {
            const j = await r.json();
            if (j.ice) ice = j.ice;
            for (const m of j.msgs as Sig[]) {
              seq = Math.max(seq, m.seq);
              await handle(m).catch(() => {});
            }
          }
        } catch { /* try again */ }
        await sleep(800);
      }
      // connected: late ICE candidates are rare, keep listening a little longer
      for (let i = 0; i < 6 && !stop; i++) {
        await sleep(1000);
        try {
          const r = await fetch(`/api/live/${streamId}/signal?key=${me}&after=${seq}`, { cache: "no-store" });
          if (r.ok) for (const m of (await r.json()).msgs as Sig[]) { seq = Math.max(seq, m.seq); await handle(m).catch(() => {}); }
        } catch { /* ignore */ }
      }
    })();

    return () => {
      stop = true;
      pc?.close();
    };
  }, [streamId, attempt]);

  return (
    <div className="absolute inset-0 bg-black">
      <video ref={videoRef} autoPlay muted={muted} playsInline className="size-full object-contain" />
      {state === "connecting" && (
        <div className="absolute inset-0 grid place-items-center text-sm text-white/80">
          <span className="flex items-center gap-2"><Loader2 className="size-5 animate-spin" aria-hidden /> {t("live.connecting")}</span>
        </div>
      )}
      {state === "failed" && (
        <div className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center">
          <div>
            <p className="mx-auto max-w-xs text-sm text-white/85">{t("live.connectFail")}</p>
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn btn-primary mt-4"><RefreshCw className="size-5" aria-hidden /> {t("live.reconnect")}</button>
          </div>
        </div>
      )}
      {state === "playing" && (
        <button
          type="button" onClick={() => setMuted((m) => !m)}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/65 px-3.5 py-2 text-sm font-semibold"
        >
          {muted ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />} {muted ? t("live.unmute") : t("live.mute")}
        </button>
      )}
    </div>
  );
}
