import { db } from "./db";
import { getUser } from "./auth";
import { mediaUrl } from "./storage";
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
 * "For You" ranking: engagement weighted and decayed by age, with a little
 * jitter so the feed doesn't feel frozen between refreshes.
 */
export async function forYou(take = 30, exclude: string[] = []) {
  const pool = await db.video.findMany({
    where: exclude.length ? { id: { notIn: exclude } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: videoInclude,
  });
  const now = Date.now();
  const scored = pool.map((v) => {
    const ageH = (now - v.createdAt.getTime()) / 3.6e6;
    const eng = v._count.likes * 3 + v._count.comments * 5 + v.shares * 4 + v.views * 0.15 + 1;
    return { v, score: (eng / Math.pow(ageH + 2, 1.15)) * (0.85 + Math.random() * 0.3) };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, take).map((x) => x.v);
}
