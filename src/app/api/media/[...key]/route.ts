import path from "path";
import { createReadStream, promises as fs } from "fs";
import { Readable } from "stream";
import { LOCAL_DIR, isOwnKey } from "@/lib/storage";

const TYPES: Record<string, string> = {
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime",
  jpg: "image/jpeg", png: "image/png", webp: "image/webp",
};

// Serves locally stored uploads with HTTP Range support, which browsers need
// for video seeking and for iOS Safari to play video at all.
export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!isOwnKey(key)) return new Response("Not found", { status: 404 });
  const file = path.join(LOCAL_DIR, key);
  const stat = await fs.stat(file).catch(() => null);
  if (!stat) return new Response("Not found", { status: 404 });

  const type = TYPES[key.split(".").pop() ?? ""] ?? "application/octet-stream";
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range) {
    let start = range[1] ? parseInt(range[1], 10) : 0;
    let end = range[2] ? parseInt(range[2], 10) : stat.size - 1;
    if (!range[1] && range[2]) {
      start = Math.max(0, stat.size - parseInt(range[2], 10));
      end = stat.size - 1;
    }
    end = Math.min(end, stat.size - 1);
    if (start > end || start >= stat.size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
    }
    const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": String(end - start + 1) },
    });
  }

  const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
  return new Response(stream, { headers: { ...headers, "Content-Length": String(stat.size) } });
}
