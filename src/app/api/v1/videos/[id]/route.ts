import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, authenticateApi } from "@/lib/api-keys";
import { deleteObject } from "@/lib/storage";
import { isCategorySlug } from "@/lib/categories";
import { setVideoCategory } from "@/lib/video-categories";
import { captionTags } from "@/lib/video-create";
import { videoSelect, videosJson } from "@/lib/api-video";

type Ctx = { params: Promise<{ id: string }> };

async function own(req: Request, ctx: Ctx) {
  const a = await authenticateApi(req);
  if ("res" in a) return a;
  const { id } = await ctx.params;
  const v = await db.video.findFirst({ where: { id, creatorId: a.user.id }, select: videoSelect });
  if (!v) return { res: apiError("Video not found.", 404, "not_found") };
  return { user: a.user, video: v };
}

/** API: one of the key owner's videos. */
export async function GET(req: Request, ctx: Ctx) {
  const o = await own(req, ctx);
  if ("res" in o) return o.res;
  return NextResponse.json((await videosJson([o.video]))[0]);
}

/** API: change the caption (hashtags follow it) and/or the category. */
export async function PATCH(req: Request, ctx: Ctx) {
  const o = await own(req, ctx);
  if ("res" in o) return o.res;
  const p = z.object({ caption: z.string().trim().max(500).optional(), category: z.string().max(24).nullable().optional() }).safeParse(await req.json().catch(() => null));
  if (!p.success) return apiError("Send JSON: { caption?, category? }.", 400, "bad_request");
  if (p.data.category && !isCategorySlug(p.data.category)) return apiError("Unknown category.", 400, "bad_category");
  if (p.data.caption !== undefined) await db.video.update({ where: { id: o.video.id }, data: { caption: p.data.caption, tags: captionTags(p.data.caption) } });
  if (p.data.category !== undefined) await setVideoCategory(o.video.id, p.data.category);
  const row = await db.video.findUnique({ where: { id: o.video.id }, select: videoSelect });
  return NextResponse.json((await videosJson([row!]))[0]);
}

/** API: delete the video and its files. */
export async function DELETE(req: Request, ctx: Ctx) {
  const o = await own(req, ctx);
  if ("res" in o) return o.res;
  await db.video.delete({ where: { id: o.video.id } });
  await Promise.all([deleteObject(o.video.videoKey), deleteObject(o.video.thumbKey)]);
  return NextResponse.json({ ok: true, id: o.video.id });
}
