"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff } from "lucide-react";
import { useT } from "./locale-provider";

/** The camera opened by the "start" button is handed to the broadcaster here, so the browser asks only once. */
export const camHold: { stream: MediaStream | null } = { stream: null };

export function openCamera() {
  return navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, audio: true });
}

type Sig = { seq: number; from: string; data: { join?: boolean; sdp?: RTCSessionDescriptionInit; ice?: RTCIceCandidateInit } };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const JSON_HEADERS = { "Content-Type": "application/json" };

/** Salon side: shows the camera preview and streams it, peer to peer, to every viewer that joins. */
export function CameraBroadcaster({ streamId }: { streamId: string }) {
  const t = useT();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    let stop = false;
    let seq = 0;
    let ice: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
    const peers = new Map<string, RTCPeerConnection>();
    const queued = new Map<string, RTCIceCandidateInit[]>();

    const post = (to: string, data: object) =>
      fetch(`/api/live/${streamId}/signal`, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ from: "host", to, data }) }).catch(() => {});

    async function onJoin(viewer: string, media: MediaStream) {
      peers.get(viewer)?.close();
      queued.delete(viewer);
      const pc = new RTCPeerConnection({ iceServers: ice });
      peers.set(viewer, pc);
      media.getTracks().forEach((tr) => pc.addTrack(tr, media));
      pc.onicecandidate = (e) => { if (e.candidate) void post(viewer, { ice: e.candidate.toJSON() }); };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          pc.close();
          if (peers.get(viewer) === pc) peers.delete(viewer);
        }
      };
      await pc.setLocalDescription(await pc.createOffer());
      await post(viewer, { sdp: pc.localDescription });
    }

    async function handle(m: Sig, media: MediaStream) {
      if (m.data.join) return onJoin(m.from, media);
      const pc = peers.get(m.from);
      if (!pc) return;
      if (m.data.sdp) {
        await pc.setRemoteDescription(m.data.sdp);
        for (const c of queued.get(m.from) ?? []) await pc.addIceCandidate(c).catch(() => {});
        queued.delete(m.from);
      } else if (m.data.ice) {
        if (pc.remoteDescription) await pc.addIceCandidate(m.data.ice).catch(() => {});
        else queued.set(m.from, [...(queued.get(m.from) ?? []), m.data.ice]);
      }
    }

    (async () => {
      let media: MediaStream;
      try {
        media = camHold.stream ?? (await openCamera());
      } catch {
        setError(t("go.cameraDenied"));
        return;
      }
      camHold.stream = null;
      if (stop) return media.getTracks().forEach((tr) => tr.stop());
      mediaRef.current = media;
      if (videoRef.current) videoRef.current.srcObject = media;

      while (!stop) {
        try {
          const r = await fetch(`/api/live/${streamId}/signal?key=host&after=${seq}`, { cache: "no-store" });
          if (r.ok) {
            const j = await r.json();
            if (j.ice) ice = j.ice;
            if (j.status === "ENDED") { router.refresh(); return; }
            for (const m of j.msgs as Sig[]) {
              seq = Math.max(seq, m.seq);
              await handle(m, media).catch(() => {});
            }
          }
        } catch { /* offline for a moment: keep trying */ }
        await sleep(1000);
      }
    })();

    return () => {
      stop = true;
      peers.forEach((p) => p.close());
      mediaRef.current?.getTracks().forEach((tr) => tr.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId]);

  function toggleMic() {
    const next = !muted;
    mediaRef.current?.getAudioTracks().forEach((tr) => (tr.enabled = !next));
    setMuted(next);
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
      {error ? (
        <p role="alert" className="grid size-full place-items-center p-6 text-center text-sm text-red-300">{error}</p>
      ) : (
        <>
          <video ref={videoRef} autoPlay muted playsInline className="size-full -scale-x-100 object-contain" />
          <button
            type="button" onClick={toggleMic} aria-pressed={muted}
            aria-label={muted ? t("go.micUnmute") : t("go.micMute")}
            className={`absolute bottom-3 right-3 grid size-11 place-items-center rounded-full ${muted ? "bg-red-600" : "bg-black/60"}`}
          >
            {muted ? <MicOff className="size-5" aria-hidden /> : <Mic className="size-5" aria-hidden />}
          </button>
        </>
      )}
    </div>
  );
}
