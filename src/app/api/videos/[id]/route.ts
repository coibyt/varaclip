import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { deleteObject } from "@/lib/storage";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const v = await db.video.findUnique({ where: { id } });
  if (!v || v.creatorId !== me.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.video.delete({ where: { id } });
  await Promise.all([deleteObject(v.videoKey), deleteObject(v.thumbKey)]);
  return NextResponse.json({ ok: true });
}
