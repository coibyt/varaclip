import { db } from "./db";
import { getUser } from "./auth";
import { mediaUrl } from "./storage";
import { affinity, loadInterests } from "./interests";
import { isAdminUser } from "./admin";
import type { Badge, BadgeMode, FeedVideo, VideoRow } from "./util";

export const videoInclude = {
  creator: { select: { id: true, handle: true, displayName: true, salonName: true, city: true, avatarKey: true, hue: true, bookingUrl: true, phone: true } },
  _count: { select: { likes: true, comments: true } },
} as const;

/** A video counts as "hot" when it got at least this many points in the last 24 hours (a like = 1, a comment = 2). */
export const HOT_MIN_POINTS = 3;
const DAY_MS = 24 * 3600_000;

type Extras = { badge: Badge; badgeMode: BadgeMode; showViews: boolean };

export function toFeedVideo(v: VideoRow, liked: Set<string>, saved: Set<string>, followed: Set<string>, x: Extras = { badge: null, badgeMode: "auto", showViews: false }): FeedVideo {
  return {
    id: v.id,
    caption: v.caption,
    tags: v.tags ? v.tags.split(" ") : [],
    videoUrl: mediaUrl(v.videoKey),
    thumbUrl: mediaUrl(v.thumbKey),
    duration: v.duration,
    views: x.showViews ? v.views : 0, // view counts are only for admins (and a salon's own dashboard)
    likes: v._count.likes,
    comments: v._count.comments,
    shares: v.shares,
    createdAt: v.createdAt.toISOString(),
    liked: liked.has(v.id),
    saved: saved.has(v.id),
    badge: x.badge,
    badgeMode: x.badgeMode,
    creator: {
      id: v.creator.id, handle: v.creator.handle, displayName: v.creator.displayName,
      salonName: v.creator.salonName, city: v.creator.city, avatarUrl: mediaUrl(v.creator.avatarKey),
      hue: v.creator.hue, bookingUrl: v.creator.bookingUrl, phone: v.creator.phone,
      followed: followed.has(v.creator.id),
    },
  };
}

/** The badge the rules give a video: "hot" for lively videos, "new" for videos posted in the last 24 hours. */
export async function autoBadge(v: { id: string; createdAt: Date }): Promise<Badge> {
  const since = new Date(Date.now() - DAY_MS);
  const [likes, comments] = await Promise.all([
    db.like.count({ where: { videoId: v.id, createdAt: { gt: since } } }),
    db.comment.count({ where: { videoId: v.id, createdAt: { gt: since } } }),
  ]);
  if (likes + comments * 2 >= HOT_MIN_POINTS) return "hot";
  return Date.now() - v.createdAt.getTime() < DAY_MS ? "new" : null;
}

/** Attach the viewer's own like/save/follow state, the badges and (for admins) the view counts to a list of rows. */
export async function hydrate(rows: VideoRow[]): Promise<FeedVideo[]> {
  if (rows.length === 0) return [];
  const me = await getUser();
  const admin = isAdminUser(me);
  const ids = rows.map((r) => r.id);
  const since = new Date(Date.now() - DAY_MS);

  const [likes24, comments24, manual] = await Promise.all([
    db.like.groupBy({ by: ["videoId"], where: { videoId: { in: ids }, createdAt: { gt: since } }, _count: { _all: true } }),
    db.comment.groupBy({ by: ["videoId"], where: { videoId: { in: ids }, createdAt: { gt: since } }, _count: { _all: true } }),
    // created by docs/database-badges.sql; until then the automatic badges still work
    db.videoBadge.findMany({ where: { videoId: { in: ids } } }).catch(() => [] as { videoId: string; badge: string }[]),
  ]);
  const l24 = new Map(likes24.map((r) => [r.videoId, r._count._all]));
  const c24 = new Map(comments24.map((r) => [r.videoId, r._count._all]));
  const manualOf = new Map(manual.map((m) => [m.videoId, m.badge as BadgeMode]));

  const extras = (r: VideoRow): Extras => {
    const mode = manualOf.get(r.id) ?? "auto";
    let badge: Badge = null;
    if (mode === "hot" || mode === "new") badge = mode;
    else if (mode === "auto") {
      if ((l24.get(r.id) ?? 0) + (c24.get(r.id) ?? 0) * 2 >= HOT_MIN_POINTS) badge = "hot";
      else if (Date.now() - r.createdAt.getTime() < DAY_MS) badge = "new";
    }
    return { badge, badgeMode: mode, showViews: admin || (!!me && r.creator.id === me.id) };
  };

  if (!me) {
    const none = new Set<string>();
    return rows.map((r) => toFeedVideo(r, none, none, none, extras(r)));
  }
  const creators = [...new Set(rows.map((r) => r.creator.id))];
  const [l, s, f] = await Promise.all([
    db.like.findMany({ where: { userId: me.id, videoId: { in: ids } }, select: { videoId: true } }),
    db.save.findMany({ where: { userId: me.id, videoId: { in: ids } }, select: { videoId: true } }),
    db.follow.findMany({ where: { followerId: me.id, followingId: { in: creators } }, select: { followingId: true } }),
  ]);
  return rows.map((r) =>
    toFeedVideo(r, new Set(l.map((x) => x.videoId)), new Set(s.map((x) => x.videoId)), new Set(f.map((x) => x.followingId)), extras(r)),
  );
}

/**
 * "For You" feed: a random order that leans towards what the viewer cares about.
 * Every video gets a weight (a little more for topics the viewer searched for, liked, saved or
 * commented on, a little more for fresh and well-liked videos) and the order is a weighted shuffle,
 * so the feed is different on every visit but favourite topics come up sooner and more often.
 */
export async function forYou(take = 30, exclude: string[] = []) {
  const [pool, interests] = await Promise.all([
    db.video.findMany({
      where: exclude.length ? { id: { notIn: exclude } } : undefined,
      orderBy: { createdAt: "desc" },
      take: 300,
      include: videoInclude,
    }),
    loadInterests(),
  ]);
  const now = Date.now();
  const keyed = pool.map((v) => {
    const a = affinity(v, interests);
    const ageH = (now - v.createdAt.getTime()) / 3.6e6;
    let w = 1 + 5 * (1 - Math.exp(-a / 6)); // topic match: up to 6x
    w *= 1 + Math.min(0.5, Math.log1p(v._count.likes) * 0.12); // a little for popular videos
    if (ageH < 24) w *= 4; // videos posted in the last 24 hours are pushed up
    else if (ageH < 72) w *= 1.25;
    // weighted random sampling: u^(1/w), the biggest keys come first
    return { v, key: Math.pow(Math.random(), 1 / w) };
  });
  keyed.sort((x, y) => y.key - x.key);
  // On a fresh visit the first video is one of the newest, so new uploads get seen first.
  if (exclude.length === 0) {
    const i = keyed.findIndex((x) => now - x.v.createdAt.getTime() < DAY_MS);
    if (i > 0) keyed.unshift(...keyed.splice(i, 1));
  }
  return keyed.slice(0, take).map((x) => x.v);
}
