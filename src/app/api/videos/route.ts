import { NextResponse } from "next/server";
import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import {
  LOCAL_DIR, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, isAllowedType, isOwnKey, isVideoType, newKey, uploadTarget, usingR2,
} from "@/lib/storage";
import { parseTags } from "@/lib/util";
import { getT } from "@/lib/i18n-server";
import { setVideoCategory } from "@/lib/video-categories";

const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/** Step 1 — ask for presigned upload targets for the video (and its poster frame). */
const presignSchema = z.object({
  videoType: z.string(),
  videoSize: z.number().int().positive(),
  thumbType: z.string().optional(),
  thumbSize: z.number().int().positive().optional(),
});

export async function PUT(req: Request) {
  const { t } = await getT();
  const me = await getUser();
  if (!me) return err(t("err.login"), 401);
  if (!me.isSalon) return err(t("err.salonOnly"), 403);
  const p = presignSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return err(t("err.badRequest"));
  const d = p.data;

  if (!isVideoType(d.videoType)) return err(t("err.videoType"));
  if (d.videoSize > MAX_VIDEO_BYTES) return err(t("err.videoSize"));

  const videoKey = newKey("video", d.videoType);
  const out: Record<string, unknown> = { videoKey, video: await uploadTarget(videoKey, d.videoType), local: !usingR2 };
  if (d.thumbType && d.thumbSize && isAllowedType(d.thumbType) && !isVideoType(d.thumbType) && d.thumbSize <= MAX_IMAGE_BYTES) {
    const thumbKey = newKey("thumb", d.thumbType);
    out.thumbKey = thumbKey;
    out.thumb = await uploadTarget(thumbKey, d.thumbType);
  }
  return NextResponse.json(out);
}

/** Step 2 — after the browser finished uploading, register the video. */
const createSchema = z.object({
  videoKey: z.string(),
  thumbKey: z.string().optional(),
  mimeType: z.string(),
  caption: z.string().trim().max(500).default(""),
  duration: z.number().min(0).max(3600).default(0),
  width: z.number().int().min(0).max(10000).default(0),
  height: z.number().int().min(0).max(10000).default(0),
  category: z.string().max(24).optional(),
});

export async function POST(req: Request) {
  const { t } = await getT();
  const me = await getUser();
  if (!me) return err(t("err.login"), 401);
  if (!me.isSalon) return err(t("err.salonOnly"), 403);
  const p = createSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return err(t("err.videoInfo"));
  const d = p.data;

  if (!isOwnKey(d.videoKey) || !d.videoKey.startsWith("videos/") || (d.thumbKey && (!isOwnKey(d.thumbKey) || !d.thumbKey.startsWith("thumbs/")))) {
    return err(t("err.badKey"));
  }
  if (!usingR2) {
    const ok = await fs.stat(path.join(LOCAL_DIR, d.videoKey)).then((s) => s.size > 0).catch(() => false);
    if (!ok) return err(t("err.noFile"));
  }

  const video = await db.video.create({
    data: {
      creatorId: me.id,
      caption: d.caption,
      tags: parseTags(d.caption.match(/#[\p{L}\p{N}_]+/gu)?.join(" ") ?? "").join(" "),
      videoKey: d.videoKey,
      thumbKey: d.thumbKey ?? "",
      mimeType: d.mimeType,
      duration: d.duration,
      width: d.width,
      height: d.height,
    },
  });
  if (d.category) await setVideoCategory(video.id, d.category);
  return NextResponse.json({ id: video.id });
}
