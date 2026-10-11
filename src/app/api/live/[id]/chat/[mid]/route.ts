import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";

/** The salon (stream owner) can remove any message; everyone can remove their own. */
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; mid: string }> }) {
  const me = await getUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, mid } = await params;
  const m = await db.chatMessage.findUnique({ where: { id: mid }, include: { stream: { select: { creatorId: true } } } });
  if (!m || m.streamId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (m.authorId !== me.id && m.stream.creatorId !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await db.chatMessage.update({ where: { id: mid }, data: { deleted: true } });
  return NextResponse.json({ ok: true });
}
