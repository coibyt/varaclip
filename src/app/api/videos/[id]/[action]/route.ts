import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";

type Ctx = { params: Promise<{ id: string; action: string }> };
const json = (b: unknown, status = 200) => NextResponse.json(b, { status });

export async function POST(req: Request, { params }: Ctx) {
  const { id, action } = await params;
  const { t } = await getT();
  const video = await db.video.findUnique({ where: { id }, select: { id: true } });
  if (!video) return json({ error: "Not found" }, 404);

  // View and share counters are anonymous-friendly.
  if (action === "view") {
    await db.video.update({ where: { id }, data: { views: { increment: 1 } } });
    return json({ ok: true });
  }
  if (action === "share") {
    await db.video.update({ where: { id }, data: { shares: { increment: 1 } } });
    return json({ ok: true });
  }

  const me = await getUser();
  if (!me) return json({ error: t("err.login") }, 401);

  if (action === "like" || action === "save") {
    const key = { userId_videoId: { userId: me.id, videoId: id } };
    const data = { userId: me.id, videoId: id };
    if (action === "like") {
      const existing = await db.like.findUnique({ where: key });
      if (existing) await db.like.delete({ where: key });
      else await db.like.create({ data });
      return json({ on: !existing, count: await db.like.count({ where: { videoId: id } }) });
    }
    const existing = await db.save.findUnique({ where: key });
    if (existing) await db.save.delete({ where: key });
    else await db.save.create({ data });
    return json({ on: !existing });
  }

  if (action === "comments") {
    const p = z.object({ body: z.string().trim().min(1).max(500) }).safeParse(await req.json().catch(() => null));
    if (!p.success) return json({ error: t("err.comment") }, 400);
    const c = await db.comment.create({
      data: { videoId: id, authorId: me.id, body: p.data.body },
      include: { author: { select: { handle: true, displayName: true, hue: true, avatarKey: true } } },
    });
    return json({ comment: c });
  }

  return json({ error: "Not found" }, 404);
}

export async function GET(_: Request, { params }: Ctx) {
  const { id, action } = await params;
  if (action !== "comments") return json({ error: "Not found" }, 404);
  const comments = await db.comment.findMany({
    where: { videoId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { author: { select: { handle: true, displayName: true, hue: true, avatarKey: true } } },
  });
  return json({ comments });
}
