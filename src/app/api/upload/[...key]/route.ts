import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { getUser } from "@/lib/auth";
import { LOCAL_DIR, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, isOwnKey, usingR2 } from "@/lib/storage";

// Development-only upload sink, used when Cloudflare R2 is not configured.
export async function PUT(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  if (usingR2) return NextResponse.json({ error: "Disabled" }, { status: 404 });
  const me = await getUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = (await params).key.join("/");
  if (!isOwnKey(key)) return NextResponse.json({ error: "Bad key" }, { status: 400 });

  const limit = key.startsWith("videos/") ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0 || buf.length > limit) return NextResponse.json({ error: "Bad size" }, { status: 413 });

  const file = path.join(LOCAL_DIR, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, buf);
  return NextResponse.json({ ok: true });
}
