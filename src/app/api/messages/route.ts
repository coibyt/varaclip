import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { authorSelect, toAuthor } from "@/lib/chat";

/** Inbox: one row per person you have talked to, newest first. */
export async function GET() {
  const me = await getUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.directMessage.findMany({
    where: { OR: [{ senderId: me.id }, { recipientId: me.id }] },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { sender: { select: { ...authorSelect, salonName: true } }, recipient: { select: { ...authorSelect, salonName: true } } },
  });
  const convos = new Map<string, { with: ReturnType<typeof toAuthor> & { salonName: string }; last: string; lastAt: string; fromMe: boolean; unread: number }>();
  for (const m of rows) {
    const other = m.senderId === me.id ? m.recipient : m.sender;
    let c = convos.get(other.id);
    if (!c) {
      c = { with: { ...toAuthor(other), salonName: other.salonName }, last: m.body, lastAt: m.createdAt.toISOString(), fromMe: m.senderId === me.id, unread: 0 };
      convos.set(other.id, c);
    }
    if (m.recipientId === me.id && !m.readAt) c.unread++;
  }
  return NextResponse.json({ conversations: [...convos.values()] });
}
