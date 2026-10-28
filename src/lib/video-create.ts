import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import { db } from "./db";
import { LOCAL_DIR, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, isAllowedType, isOwnKey, isVideoType, newKey, uploadTarget, usingR2 } from "./storage";
import { parseTags } from "./util";
import { setVideoCategory } from "./video-categories";

/**
 * Posting a video happens in two steps, shared by the website (/api/videos) and the API for posting
 * software (/api/v1): 1) get presigned upload addresses, 2) after the file is uploaded, register the video.
 * Errors come back as codes; each caller turns them into its own message.
 */
export const presignSchema = z.object({
  videoType: z.string(),
  videoSize: z.number().int().positive(),
  thumbType: z.string().optional(),
  thumbSize: z.number().int().positive().optional(),
});

export const createSchema = z.object({
  videoKey: z.string(),
  thumbKey: z.string().optional(),
  mimeType: z.string(),
  caption: z.string().trim().max(500).default(""),
  duration: z.number().min(0).max(3600).default(0),
  width: z.number().int().min(0).max(10000).default(0),
  height: z.number().int().min(0).max(10000).default(0),
  category: z.string().max(24).optional(),
});

export type CreateError = "videoType" | "videoSize" | "badKey" | "noFile";

export async function presignUpload(d: z.infer<typeof presignSchema>): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; code: CreateError }> {
  if (!isVideoType(d.videoType)) return { ok: false, code: "videoType" };
  if (d.videoSize > MAX_VIDEO_BYTES) return { ok: false, code: "videoSize" };
  const videoKey = newKey("video", d.videoType);
  const out: Record<string, unknown> = { videoKey, video: await uploadTarget(videoKey, d.videoType), local: !usingR2 };
  if (d.thumbType && d.thumbSize && isAllowedType(d.thumbType) && !isVideoType(d.thumbType) && d.thumbSize <= MAX_IMAGE_BYTES) {
    const thumbKey = newKey("thumb", d.thumbType);
    out.thumbKey = thumbKey;
    out.thumb = await uploadTarget(thumbKey, d.thumbType);
  }
  return { ok: true, data: out };
}

export const captionTags = (caption: string) => parseTags(caption.match(/#[\p{L}\p{N}_]+/gu)?.join(" ") ?? "").join(" ");

export async function registerVideo(creatorId: string, d: z.infer<typeof createSchema>): Promise<{ ok: true; id: string } | { ok: false; code: CreateError }> {
  if (!isOwnKey(d.videoKey) || !d.videoKey.startsWith("videos/") || (d.thumbKey && (!isOwnKey(d.thumbKey) || !d.thumbKey.startsWith("thumbs/")))) {
    return { ok: false, code: "badKey" };
  }
  if (!usingR2) {
    const ok = await fs.stat(path.join(LOCAL_DIR, d.videoKey)).then((s) => s.size > 0).catch(() => false);
    if (!ok) return { ok: false, code: "noFile" };
  }
  const video = await db.video.create({
    data: {
      creatorId,
      caption: d.caption,
      tags: captionTags(d.caption),
      videoKey: d.videoKey,
      thumbKey: d.thumbKey ?? "",
      mimeType: d.mimeType,
      duration: d.duration,
      width: d.width,
      height: d.height,
    },
  });
  if (d.category) await setVideoCategory(video.id, d.category);
  return { ok: true, id: video.id };
}
