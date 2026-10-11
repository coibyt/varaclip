export function compact(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "K";
  return String(n);
}

export function timeAgo(d: Date | string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "vừa xong";
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} ngày trước`;
  return new Date(d).toLocaleDateString("vi-VN");
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
