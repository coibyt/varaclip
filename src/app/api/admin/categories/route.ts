import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { isCategorySlug } from "@/lib/categories";
import { guessCategory } from "@/lib/auto-category";
import { setVideoCategory } from "@/lib/video-categories";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("auto") }),
  z.object({ action: z.literal("set"), videoId: z.string().min(5).max(60), category: z.string().max(24).nullable() }),
]);

/** Admin: put older videos into categories, automatically from their captions, or one by one. */
export async function POST(req: Request) {
  if (!isAdminUser(await getUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  if (p.data.action === "set") {
    if (p.data.category !== null && !isCategorySlug(p.data.category)) return NextResponse.json({ error: "Bad category" }, { status: 400 });
    const ok = await setVideoCategory(p.data.videoId, p.data.category);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Chưa có bảng VideoCategory: chạy SQL trong phpMyAdmin." }, { status: 500 });
  }

  // Automatic: only videos that have no category yet, so a choice made by a salon or an admin is never overwritten.
  let done: Set<string>;
  try {
    done = new Set((await db.videoCategory.findMany({ select: { videoId: true } })).map((r) => r.videoId));
  } catch {
    return NextResponse.json({ error: "Chưa có bảng VideoCategory: chạy SQL trong phpMyAdmin." }, { status: 500 });
  }
  const videos = await db.video.findMany({ select: { id: true, caption: true, tags: true } });
  const byCategory: Record<string, number> = {};
  let assigned = 0;
  let left = 0;
  for (const v of videos) {
    if (done.has(v.id)) continue;
    const c = guessCategory(v.caption, v.tags);
    if (!c) { left++; continue; }
    await db.videoCategory.create({ data: { videoId: v.id, category: c } });
    byCategory[c] = (byCategory[c] ?? 0) + 1;
    assigned++;
  }
  return NextResponse.json({ ok: true, assigned, left, byCategory });
}
