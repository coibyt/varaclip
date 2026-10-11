export function compact(n: number, locale = "en") {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: n >= 10_000 ? 0 : 1 }).format(n);
}

export function timeAgo(d: Date | string, locale = "en", justNow = "now") {
  const s = (new Date(d).getTime() - Date.now()) / 1000; // negative = past
  const abs = Math.abs(s);
  if (abs < 60) return justNow;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(s / 86400), "day");
  return new Date(d).toLocaleDateString(locale);
}

export function parseTags(raw: string) {
  const tags = (raw.match(/#?[\p{L}\p{N}_]+/gu) ?? []).map((t) => t.replace(/^#/, "").toLowerCase());
  return [...new Set(tags)].slice(0, 8);
}

export const HANDLE_RE = /^[a-z0-9_.]{3,24}$/;

export type FeedVideo = {
  id: string;
  caption: string;
  tags: string[];
  videoUrl: string;
  thumbUrl: string;
  duration: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  createdAt: string;
  liked: boolean;
  saved: boolean;
  creator: {
    id: string; handle: string; displayName: string; salonName: string; city: string;
    avatarUrl: string; hue: number; bookingUrl: string; phone: string; followed: boolean;
  };
};

export type VideoRow = {
  id: string; caption: string; tags: string; videoKey: string; thumbKey: string; duration: number;
  views: number; shares: number; createdAt: Date;
  creator: { id: string; handle: string; displayName: string; salonName: string; city: string; avatarKey: string; hue: number; bookingUrl: string; phone: string };
  _count: { likes: number; comments: number };
};
