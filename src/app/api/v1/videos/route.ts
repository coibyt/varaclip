import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, authenticateApi } from "@/lib/api-keys";
import { createSchema, registerVideo } from "@/lib/video-create";
import { videoSelect, videosJson } from "@/lib/api-video";

const MESSAGES = { videoType: "Only MP4, WebM or MOV videos.", videoSize: "The video is larger than 200 MB.", badKey: "Invalid videoKey or thumbKey.", noFile: "The file was not uploaded." };

/** API: the key owner's videos, newest first (?page=1&limit=20). */
export async function GET(req: Request) {
  const a = await authenticateApi(req);
  if ("res" in a) return a.res;
  const q = new URL(req.url).searchParams;
  const limit = Math.min(100, Math.max(1, Number(q.get("limit")) || 20));
  const page = Math.max(1, Number(q.get("page")) || 1);
  const [total, rows] = await Promise.all([
    db.video.count({ where: { creatorId: a.user.id } }),
    db.video.findMany({ where: { creatorId: a.user.id }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit, select: videoSelect }),
  ]);
  return NextResponse.json({ page, limit, total, items: await videosJson(rows) });
}

/** API step 2: after the upload, publish the video. */
export async function POST(req: Request) {
  const a = await authenticateApi(req);
  if ("res" in a) return a.res;
  if (!a.user.isSalon) return apiError("Only salon accounts can post videos.", 403, "not_salon");
  const p = createSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return apiError("Send JSON: { videoKey, thumbKey?, mimeType, caption?, category?, duration?, width?, height? }.", 400, "bad_request");
  const r = await registerVideo(a.user.id, p.data);
  if (!r.ok) return apiError(MESSAGES[r.code], 400, r.code);
  const row = await db.video.findUnique({ where: { id: r.id }, select: videoSelect });
  return NextResponse.json((await videosJson([row!]))[0], { status: 201 });
}
