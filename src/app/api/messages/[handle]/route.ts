import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { DM_GAP_MS, toAuthor, type DirectMsg } from "@/lib/chat";

const json = (b: unknown, status = 200) => NextResponse.json(b, { status });
type Ctx = { params: Promise<{ handle: string }> };

const select = { id: true, handle: true, displayName: true, hue: true, avatarKey: true, salonName: true, isSalon: true } as const;

/** Thread with one person. Opening it marks their messages as read. */
export async function GET(req: Request, { params }: Ctx) {
  const me = await getUser();
  if (!me) return json({ error: "Unauthorized" }, 401);
  const other = await db.user.findUnique({ where: { handle: (await params).handle }, select });
  if (!other) return json({ error: "Not found" }, 404);

  const afterRaw = new URL(req.url).searchParams.get("after");
  const after = afterRaw ? new Date(afterRaw) : null;
  const valid = after && !isNaN(after.getTime());
  const pair = { OR: [{ senderId: me.id, recipientId: other.id }, { senderId: other.id, recipientId: me.id }] };

  const rows = valid
    ? await db.directMessage.findMany({ where: { AND: [pair, { createdAt: { gt: new Date(after!.getTime() - 2000) } }] }, orderBy: { createdAt: "asc" }, take: 200 })
    : (await db.directMessage.findMany({ where: pair, orderBy: { createdAt: "desc" }, take: 100 })).reverse();

  await db.directMessage.updateMany({ where: { senderId: other.id, recipientId: me.id, readAt: null }, data: { readAt: new Date() } });

  const messages: DirectMsg[] = rows.map((m) => ({ id: m.id, body: m.body, createdAt: m.createdAt.toISOString(), mine: m.senderId === me.id }));
  return json({ messages, with: { ...toAuthor(other), salonName: other.salonName, isSalon: other.isSalon } });
}

export async function POST(req: Request, { params }: Ctx) {
  const { t } = await getT();
  const me = await getUser();
  if (!me) return json({ error: t("err.login") }, 401);
  const other = await db.user.findUnique({ where: { handle: (await params).handle }, select: { id: true } });
  if (!other) return json({ error: "Not found" }, 404);
  if (other.id === me.id) return json({ error: t("err.cantMessageSelf") }, 400);

  const p = z.object({ body: z.string().trim().min(1).max(1000) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return json({ error: t("err.msgInvalid") }, 400);

  const last = await db.directMessage.findFirst({ where: { senderId: me.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
  if (last && Date.now() - last.createdAt.getTime() < DM_GAP_MS) return json({ error: t("err.slow") }, 429);

  const m = await db.directMessage.create({ data: { senderId: me.id, recipientId: other.id, body: p.data.body } });
  const message: DirectMsg = { id: m.id, body: m.body, createdAt: m.createdAt.toISOString(), mine: true };
  return json({ message });
}
