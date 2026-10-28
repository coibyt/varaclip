import { db } from "./db";
import { mediaUrl } from "./storage";
import { categoriesOf } from "./video-categories";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://varaclip.com").replace(/\/$/, "");

type Row = { id: string; caption: string; tags: string; videoKey: string; thumbKey: string; duration: number; views: number; shares: number; createdAt: Date };

/** How the API for posting software describes a video. */
export async function videosJson(rows: Row[]) {
  const ids = rows.map((r) => r.id);
  const [cats, likes, comments] = await Promise.all([
    categoriesOf(ids),
    db.like.groupBy({ by: ["videoId"], where: { videoId: { in: ids } }, _count: { _all: true } }),
    db.comment.groupBy({ by: ["videoId"], where: { videoId: { in: ids } }, _count: { _all: true } }),
  ]);
  const l = new Map(likes.map((x) => [x.videoId, x._count._all]));
  const c = new Map(comments.map((x) => [x.videoId, x._count._all]));
  return rows.map((v) => ({
    id: v.id,
    caption: v.caption,
    tags: v.tags ? v.tags.split(" ") : [],
    category: cats.get(v.id) ?? null,
    url: `${SITE}/v/${v.id}`,
    embed_url: `${SITE}/embed/v/${v.id}`,
    video_url: mediaUrl(v.videoKey),
    thumbnail: mediaUrl(v.thumbKey) || null,
    duration: v.duration,
    views: v.views,
    likes: l.get(v.id) ?? 0,
    comments: c.get(v.id) ?? 0,
    shares: v.shares,
    created_at: v.createdAt.toISOString(),
  }));
}

export const videoSelect = { id: true, caption: true, tags: true, videoKey: true, thumbKey: true, duration: true, views: true, shares: true, createdAt: true } as const;
