import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mediaUrl } from "@/lib/storage";

/**
 * Same-origin copy of a video, used only as a fallback when the storage bucket
 * does not send CORS headers: the download renderer needs untainted pixels to
 * burn the watermark in. Streams the file through, nothing is stored.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const v = await db.video.findUnique({ where: { id: (await params).id }, select: { videoKey: true } });
  if (!v) return new Response("Not found", { status: 404 });

  const url = mediaUrl(v.videoKey);
  if (url.startsWith("/")) return NextResponse.redirect(new URL(url, req.url)); // local dev storage is already same-origin

  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) return new Response("Bad gateway", { status: 502 });
  const headers: Record<string, string> = {
    "Content-Type": upstream.headers.get("content-type") ?? "video/mp4",
    "Cache-Control": "public, max-age=3600",
  };
  const len = upstream.headers.get("content-length");
  if (len) headers["Content-Length"] = len;
  return new Response(upstream.body, { headers });
}
