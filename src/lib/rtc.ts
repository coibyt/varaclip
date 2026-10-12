/**
 * Signalling for camera livestreams (WebRTC, peer to peer).
 *
 * The salon's browser streams straight to each viewer's browser; the server only relays the
 * small handshake messages (offer / answer / ICE candidates) between them. Messages are short
 * lived, so they are kept in memory instead of the database.
 */
type Msg = { seq: number; from: string; data: unknown; at: number };
type Store = { q: Map<string, Msg[]>; seq: number; host: Map<string, number> };

const g = globalThis as unknown as { __vcRtc?: Store };
const S: Store = (g.__vcRtc ??= { q: new Map(), seq: 0, host: new Map() });

const TTL_MS = 120_000;
const MAX_QUEUE = 300;
export const HOST_GONE_MS = 60_000;

function sweep(now: number) {
  for (const [k, arr] of S.q) {
    const fresh = arr.filter((m) => now - m.at < TTL_MS);
    if (fresh.length) S.q.set(k, fresh);
    else S.q.delete(k);
  }
}

export function pushSignal(streamId: string, to: string, from: string, data: unknown) {
  const now = Date.now();
  if (S.q.size > 500) sweep(now);
  const k = `${streamId}:${to}`;
  const arr = (S.q.get(k) ?? []).filter((m) => now - m.at < TTL_MS);
  arr.push({ seq: ++S.seq, from, data, at: now });
  if (arr.length > MAX_QUEUE) arr.splice(0, arr.length - MAX_QUEUE);
  S.q.set(k, arr);
}

export function readSignals(streamId: string, key: string, after: number) {
  return (S.q.get(`${streamId}:${key}`) ?? []).filter((m) => m.seq > after).map(({ seq, from, data }) => ({ seq, from, data }));
}

export const markHost = (streamId: string) => void S.host.set(streamId, Date.now());
export const hostSeen = (streamId: string) => S.host.get(streamId);

/** STUN is free; set TURN_URL / TURN_USERNAME / TURN_CREDENTIAL to also relay for networks that block direct connections. */
export function iceServers(): { urls: string | string[]; username?: string; credential?: string }[] {
  const list: { urls: string | string[]; username?: string; credential?: string }[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  const turn = process.env.TURN_URL;
  if (turn) list.push({ urls: turn.split(",").map((u) => u.trim()).filter(Boolean), username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
  return list;
}
