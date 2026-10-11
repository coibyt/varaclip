import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "crypto";
import path from "path";
import { promises as fs } from "fs";

/**
 * Two backends behind one interface:
 *  - Cloudflare R2 (production): the browser PUTs straight to R2 with a
 *    presigned URL, so video bytes never pass through our server.
 *  - Local disk (development, when R2_* is unset): the browser PUTs to our own
 *    /api/upload/<key> route and files live in ./uploads.
 */
const r2 = {
  account: process.env.R2_ACCOUNT_ID,
  key: process.env.R2_ACCESS_KEY_ID,
  secret: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET,
  publicUrl: (process.env.R2_PUBLIC_URL || "").replace(/\/$/, ""),
};
export const usingR2 = Boolean(r2.account && r2.key && r2.secret && r2.bucket && r2.publicUrl);

let client: S3Client | null = null;
function s3() {
  client ??= new S3Client({
    region: "auto",
    forcePathStyle: true, // https://<account>.r2.cloudflarestorage.com/<bucket>/<key>: one hostname, no per-bucket DNS
    endpoint: `https://${r2.account}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: r2.key!, secretAccessKey: r2.secret! },
  });
  return client;
}

export const LOCAL_DIR = path.join(process.cwd(), "uploads");

export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = {
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
};
export const isAllowedType = (t: string) => t in EXT;
export const isVideoType = (t: string) => t.startsWith("video/") && t in EXT;

export function newKey(kind: "video" | "thumb" | "avatar", mime: string) {
  return `${kind}s/${Date.now().toString(36)}-${randomBytes(8).toString("hex")}.${EXT[mime]}`;
}

/** A key we generated ourselves; guards against clients submitting arbitrary paths. */
export const isOwnKey = (k: string) => /^(videos|thumbs|avatars)\/[a-z0-9-]+\.[a-z0-9]+$/.test(k);

export async function uploadTarget(key: string, mime: string) {
  if (usingR2) {
    const url = await getSignedUrl(
      s3(),
      new PutObjectCommand({ Bucket: r2.bucket, Key: key, ContentType: mime }),
      { expiresIn: 900 },
    );
    return { url, method: "PUT" as const, headers: { "Content-Type": mime } };
  }
  return { url: `/api/upload/${key}`, method: "PUT" as const, headers: { "Content-Type": mime } };
}

/** Public URL for a stored key; full URLs (demo seed data) pass through. */
export function mediaUrl(key: string) {
  if (!key) return "";
  if (/^https?:\/\//.test(key)) return key;
  return usingR2 ? `${r2.publicUrl}/${key}` : `/api/media/${key}`;
}

export async function deleteObject(key: string) {
  if (!key || !isOwnKey(key)) return;
  try {
    if (usingR2) await s3().send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: key }));
    else await fs.unlink(path.join(LOCAL_DIR, key));
  } catch {
    /* already gone */
  }
}
