import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { autoBadge } from "@/lib/videos";

/** Admin: set a video's badge by hand ("hot" / "new"), hide it ("none") or hand it back to the automatic rules ("auto"). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getUser();
  if (!isAdminUser(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const p = z.object({ badge: z.enum(["auto", "hot", "new", "none"]) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const video = await db.video.findUnique({ where: { id }, select: { id: true, createdAt: true } });
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    if (p.data.badge === "auto") await db.videoBadge.deleteMany({ where: { videoId: id } });
    else await db.videoBadge.upsert({ where: { videoId: id }, update: { badge: p.data.badge }, create: { videoId: id, badge: p.data.badge } });
  } catch {
    return NextResponse.json({ error: "Chưa có bảng huy hiệu: chạy file SQL database-badges.sql trong phpMyAdmin." }, { status: 500 });
  }
  // What the viewers will see now (for "auto" this needs the engagement of the last 24 hours).
  const badge = p.data.badge === "none" ? null : p.data.badge === "auto" ? await autoBadge(video) : p.data.badge;
  return NextResponse.json({ ok: true, badge });
}
