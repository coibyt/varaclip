import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://varaclip.com").replace(/\/$/, "");
export const dynamic = "force-dynamic";

/** Pages search engines should index: home, categories, salons and videos. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const fixed: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE}/c`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...CATEGORIES.map((c) => ({ url: `${SITE}/c/${c.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.9 })),
    { url: `${SITE}/discover`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE}/live`, lastModified: now, changeFrequency: "hourly", priority: 0.6 },
  ];
  const [salons, videos] = await Promise.all([
    db.user.findMany({ where: { isSalon: true }, select: { handle: true, createdAt: true }, take: 2000 }).catch(() => []),
    db.video.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, createdAt: true }, take: 5000 }).catch(() => []),
  ]);
  return [
    ...fixed,
    ...salons.map((s) => ({ url: `${SITE}/u/${s.handle}`, lastModified: s.createdAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...videos.map((v) => ({ url: `${SITE}/v/${v.id}`, lastModified: v.createdAt, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
