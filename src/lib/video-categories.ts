import { db } from "./db";
import { isCategorySlug, type CategorySlug } from "./categories";

/**
 * Which category each video is in. Kept in its own table (VideoCategory, see docs/database-categories.sql);
 * every function here works quietly without it, so the site keeps running before the table exists.
 */
export async function setVideoCategory(videoId: string, slug: string | null) {
  try {
    if (slug && isCategorySlug(slug)) {
      await db.videoCategory.upsert({ where: { videoId }, update: { category: slug }, create: { videoId, category: slug } });
    } else {
      await db.videoCategory.deleteMany({ where: { videoId } });
    }
    return true;
  } catch {
    return false;
  }
}

export async function categoriesOf(videoIds: string[]): Promise<Map<string, CategorySlug>> {
  if (!videoIds.length) return new Map();
  const rows = await db.videoCategory.findMany({ where: { videoId: { in: videoIds } } }).catch(() => []);
  return new Map(rows.filter((r) => isCategorySlug(r.category)).map((r) => [r.videoId, r.category as CategorySlug]));
}

/** Ids of the newest videos in a category. */
export async function videoIdsIn(slug: CategorySlug, take = 60): Promise<string[]> {
  const rows = await db.videoCategory.findMany({ where: { category: slug }, select: { videoId: true } }).catch(() => []);
  if (!rows.length) return [];
  const vids = await db.video.findMany({ where: { id: { in: rows.map((r) => r.videoId) } }, orderBy: { createdAt: "desc" }, take, select: { id: true } });
  return vids.map((v) => v.id);
}

/** How many videos each category has (null when the table does not exist yet). */
export async function categoryCounts(): Promise<Map<string, number> | null> {
  try {
    const rows = await db.videoCategory.groupBy({ by: ["category"], _count: { _all: true } });
    return new Map(rows.map((r) => [r.category, r._count._all]));
  } catch {
    return null;
  }
}
