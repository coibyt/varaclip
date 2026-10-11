import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";

/** The salon blocks a chatter: no more messages, and everything they said in this stream disappears. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const stream = await db.liveStream.findUnique({ where: { id }, select: { creatorId: true } });
  if (!stream || stream.creatorId !== me.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const p = z.object({ userId: z.string().min(1).max(40) }).safeParse(await req.json().catch(() => null));
  if (!p.success || p.data.userId === me.id) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  await db.chatBan.upsert({
    where: { creatorId_userId: { creatorId: me.id, userId: p.data.userId } },
    update: {},
    create: { creatorId: me.id, userId: p.data.userId },
  });
  await db.chatMessage.updateMany({ where: { streamId: id, authorId: p.data.userId }, data: { deleted: true } });
  return NextResponse.json({ ok: true });
}
