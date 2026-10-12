import { db } from "./db";

/**
 * Livestreams run on the salon's own YouTube / Facebook / TikTok account: the
 * salon pastes the link of its live, VaraClip embeds it (where the platform
 * allows) and adds the chat, viewer count and moderation around it.
 */
/** A salon needs this many followers before it can announce a live. */
export const LIVE_MIN_FOLLOWERS = 0;

export type Platform = "youtube" | "facebook" | "tiktok";
export type LiveSource = { platform: Platform; sourceUrl: string; embedId: string };
export type ParseError = "invalid" | "channel";

const YT_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"]);
const FB_HOSTS = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com", "fb.watch"]);
const TT_HOSTS = new Set(["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"]);
const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const YT_CHANNEL = /^UC[A-Za-z0-9_-]{22}$/;

export function parseLiveUrl(raw: string): LiveSource | { error: ParseError } {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return { error: "invalid" };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { error: "invalid" };
  const host = u.hostname.toLowerCase();
  const parts = u.pathname.split("/").filter(Boolean);

  if (YT_HOSTS.has(host)) {
    let id: string | undefined;
    if (host.endsWith("youtu.be")) id = parts[0];
    else if (parts[0] === "watch") id = u.searchParams.get("v") ?? undefined;
    else if (parts[0] === "live" || parts[0] === "embed") id = parts[1];
    if (id && YT_ID.test(id)) return { platform: "youtube", sourceUrl: `https://www.youtube.com/watch?v=${id}`, embedId: id };
    // A link to a channel's "/live" page can be embedded only when it carries the channel id.
    if (parts[0] === "channel" && YT_CHANNEL.test(parts[1] ?? "")) {
      return { platform: "youtube", sourceUrl: `https://www.youtube.com/channel/${parts[1]}/live`, embedId: `channel:${parts[1]}` };
    }
    return { error: "channel" }; // e.g. youtube.com/@name/live: needs the link of the live itself
  }

  if (FB_HOSTS.has(host) && (host === "fb.watch" || parts.length > 0)) {
    return { platform: "facebook", sourceUrl: u.toString().slice(0, 600), embedId: "" };
  }
  if (TT_HOSTS.has(host)) {
    return { platform: "tiktok", sourceUrl: u.toString().slice(0, 600), embedId: "" };
  }
  return { error: "invalid" };
}

/** iframe address for the platforms that allow embedding; null for TikTok. */
export function embedSrc(s: { platform: string; sourceUrl: string; embedId: string }): string | null {
  if (s.platform === "youtube") {
    if (s.embedId.startsWith("channel:")) {
      return `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(s.embedId.slice(8))}&autoplay=1&mute=1&playsinline=1&rel=0`;
    }
    return YT_ID.test(s.embedId) ? `https://www.youtube.com/embed/${s.embedId}?autoplay=1&mute=1&playsinline=1&rel=0` : null;
  }
  if (s.platform === "facebook") {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(s.sourceUrl)}&show_text=false&autoplay=true&mute=true`;
  }
  return null;
}

export function thumbUrl(s: { platform: string; embedId: string }): string | null {
  return s.platform === "youtube" && YT_ID.test(s.embedId) ? `https://i.ytimg.com/vi/${s.embedId}/hqdefault.jpg` : null;
}

export const platformName = (p: string) => (p === "youtube" ? "YouTube" : p === "facebook" ? "Facebook" : p === "tiktok" ? "TikTok" : p);

const MAX_LIVE_MS = 8 * 3600_000; // a forgotten broadcast closes itself
const VIEWER_WINDOW_MS = 30_000;

export async function endStream(id: string) {
  await db.liveStream.updateMany({ where: { id, status: "LIVE" }, data: { status: "ENDED", endedAt: new Date() } });
}

/** Close broadcasts that have been "live" for longer than any real broadcast would run. */
export async function closeStaleStreams() {
  await db.liveStream.updateMany({
    where: { status: "LIVE", startedAt: { lt: new Date(Date.now() - MAX_LIVE_MS) } },
    data: { status: "ENDED", endedAt: new Date() },
  });
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
  await db.liveStream.updateMany({ where: { id: streamId, peakViewers: { lt: n } }, data: { peakViewers: n } });
  return n;
}
