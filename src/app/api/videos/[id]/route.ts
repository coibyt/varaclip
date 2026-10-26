import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { deleteObject } from "@/lib/storage";
import { getT } from "@/lib/i18n-server";
import { parseTags } from "@/lib/util";
import { setVideoCategory } from "@/lib/video-categories";

type Ctx = { params: Promise<{ id: string }> };

/** Owner edits the caption; hashtags are recalculated from it. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { t } = await getT();
  const me = await getUser();
  if (!me) return NextResponse.json({ error: t("err.login") }, { status: 401 });
  const { id } = await params;
  const v = await db.video.findUnique({ where: { id }, select: { creatorId: true } });
  if (!v || v.creatorId !== me.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const p = z.object({ caption: z.string().trim().max(500), category: z.string().max(24).nullable().optional() }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: t("err.invalid") }, { status: 400 });

  const tags = parseTags(p.data.caption.match(/#[\p{L}\p{N}_]+/gu)?.join(" ") ?? "").join(" ");
  await db.video.update({ where: { id }, data: { caption: p.data.caption, tags } });
  if (p.data.category !== undefined) await setVideoCategory(id, p.data.category);
  return NextResponse.json({ ok: true, caption: p.data.caption });
}

export async function DELETE(_: Request, { params }: Ctx) {
  const me = await getUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const v = await db.video.findUnique({ where: { id } });
  if (!v || v.creatorId !== me.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.video.delete({ where: { id } });
  await Promise.all([deleteObject(v.videoKey), deleteObject(v.thumbKey)]);
  return NextResponse.json({ ok: true });
}
