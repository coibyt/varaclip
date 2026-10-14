import { db } from "./db";
import { getUser } from "./auth";
import { mediaUrl } from "./storage";
import { affinity, loadInterests } from "./interests";
import type { FeedVideo, VideoRow } from "./util";

export const videoInclude = {
  creator: { select: { id: true, handle: true, displayName: true, salonName: true, city: true, avatarKey: true, hue: true, bookingUrl: true, phone: true } },
  _count: { select: { likes: true, comments: true } },
} as const;

export function toFeedVideo(v: VideoRow, liked: Set<string>, saved: Set<string>, followed: Set<string>): FeedVideo {
  return {
    id: v.id,
    caption: v.caption,
    tags: v.tags ? v.tags.split(" ") : [],
    videoUrl: mediaUrl(v.videoKey),
    thumbUrl: mediaUrl(v.thumbKey),
    duration: v.duration,
    views: v.views,
    likes: v._count.likes,
    comments: v._count.comments,
    shares: v.shares,
    createdAt: v.createdAt.toISOString(),
    liked: liked.has(v.id),
    saved: saved.has(v.id),
    creator: {
      id: v.creator.id, handle: v.creator.handle, displayName: v.creator.displayName,
      salonName: v.creator.salonName, city: v.creator.city, avatarUrl: mediaUrl(v.creator.avatarKey),
      hue: v.creator.hue, bookingUrl: v.creator.bookingUrl, phone: v.creator.phone,
      followed: followed.has(v.creator.id),
    },
  };
}

/** Attach the viewer's own like/save/follow state to a list of rows. */
export async function hydrate(rows: VideoRow[]): Promise<FeedVideo[]> {
  const me = await getUser();
  if (!me || rows.length === 0) {
    const none = new Set<string>();
    return rows.map((r) => toFeedVideo(r, none, none, none));
  }
  const ids = rows.map((r) => r.id);
  const creators = [...new Set(rows.map((r) => r.creator.id))];
  const [l, s, f] = await Promise.all([
    db.like.findMany({ where: { userId: me.id, videoId: { in: ids } }, select: { videoId: true } }),
    db.save.findMany({ where: { userId: me.id, videoId: { in: ids } }, select: { videoId: true } }),
    db.follow.findMany({ where: { followerId: me.id, followingId: { in: creators } }, select: { followingId: true } }),
  ]);
  return rows.map((r) =>
    toFeedVideo(r, new Set(l.map((x) => x.videoId)), new Set(s.map((x) => x.videoId)), new Set(f.map((x) => x.followingId))),
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
    if (ageH < 72) w *= 1.25; // and for new ones
    // weighted random sampling: u^(1/w), the biggest keys come first
    return { v, key: Math.pow(Math.random(), 1 / w) };
  });
  keyed.sort((x, y) => y.key - x.key);
  return keyed.slice(0, take).map((x) => x.v);
}
