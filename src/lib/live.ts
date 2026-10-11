import { db } from "./db";

/**
 * Livestreaming runs on Cloudflare Stream Live: the salon's browser publishes
 * over WebRTC (WHIP) straight to Cloudflare and viewers watch Cloudflare's
 * player. Our server only creates/deletes the "live input" and keeps the chat.
 *
 * Env: CF_STREAM_TOKEN (API token with Stream:Edit), CF_STREAM_CUSTOMER
 * (the "customer-xxxx" subdomain shown in the Stream dashboard) and the
 * account id (CF_ACCOUNT_ID, or R2_ACCOUNT_ID which is the same value).
 */
const account = () => process.env.CF_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || "";
const token = () => process.env.CF_STREAM_TOKEN || "";
export const customerHost = () => {
  const c = (process.env.CF_STREAM_CUSTOMER || "").trim().replace(/^https?:\/\//, "").replace(/\.cloudflarestream\.com.*$/, "");
  return c ? `${c.startsWith("customer-") ? c : `customer-${c}`}.cloudflarestream.com` : "";
};

export const liveConfigured = () => Boolean(account() && token() && customerHost());

const api = (path = "") => `https://api.cloudflare.com/client/v4/accounts/${account()}/stream/live_inputs${path}`;
const headers = () => ({ Authorization: `Bearer ${token()}`, "Content-Type": "application/json" });

export async function createLiveInput(name: string) {
  const r = await fetch(api(), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ meta: { name }, recording: { mode: "off" } }),
  });
  const j = await r.json().catch(() => null);
  const res = j?.result;
  if (!r.ok || !res?.uid || !res?.webRTC?.url) {
    throw new Error(`cloudflare: ${j?.errors?.[0]?.message ?? r.status}`);
  }
  return { uid: String(res.uid), whipUrl: String(res.webRTC.url) };
}

export async function deleteLiveInput(uid: string) {
  try {
    await fetch(api(`/${uid}`), { method: "DELETE", headers: headers() });
  } catch {
    /* best effort: an orphaned input costs nothing while idle */
  }
}

/** Player URL for viewers (muted autoplay so browsers allow it; viewers unmute in the player). */
export const playerUrl = (uid: string) =>
  `https://${customerHost()}/${uid}/iframe?autoplay=true&muted=true&letterboxColor=black&primaryColor=%23FF4D8D`;

const STALE_MS = 90_000;
const VIEWER_WINDOW_MS = 30_000;

export async function endStream(id: string, cfInputId: string) {
  await db.liveStream.updateMany({ where: { id, status: "LIVE" }, data: { status: "ENDED", endedAt: new Date() } });
  await deleteLiveInput(cfInputId);
}

/** Close broadcasts whose publisher stopped sending heartbeats (closed tab, lost signal). */
export async function closeStaleStreams() {
  const stale = await db.liveStream.findMany({
    where: { status: "LIVE", lastBeat: { lt: new Date(Date.now() - STALE_MS) } },
    select: { id: true, cfInputId: true },
  });
  await Promise.all(stale.map((s) => endStream(s.id, s.cfInputId)));
}

export async function viewerCount(streamId: string) {
  return db.liveViewer.count({ where: { streamId, lastSeen: { gt: new Date(Date.now() - VIEWER_WINDOW_MS) } } });
}

export async function touchViewer(streamId: string, key: string) {
  await db.liveViewer.upsert({
    where: { streamId_key: { streamId, key } },
    update: { lastSeen: new Date() },
    create: { streamId, key },
  });
  const n = await viewerCount(streamId);
  // Remember the high-water mark (best effort).
  await db.liveStream.updateMany({ where: { id: streamId, peakViewers: { lt: n } }, data: { peakViewers: n } });
  return n;
}
