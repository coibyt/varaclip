import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { CHAT_GAP_MS, authorSelect, toAuthor, type ChatMsg } from "@/lib/chat";
import { touchViewer } from "@/lib/live";

const json = (b: unknown, status = 200) => NextResponse.json(b, { status });
type Ctx = { params: Promise<{ id: string }> };

/** Poll: new messages since `after`, ids to remove (moderated), stream status and the viewer count. */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const url = new URL(req.url);
  const stream = await db.liveStream.findUnique({ where: { id }, select: { status: true } });
  if (!stream) return json({ error: "Not found" }, 404);

  const viewerKey = (url.searchParams.get("vk") ?? "").replace(/[^\w-]/g, "").slice(0, 40);
  const afterRaw = url.searchParams.get("after");
  const after = afterRaw ? new Date(afterRaw) : null;
  const valid = after && !isNaN(after.getTime());

  const [viewers, rows, removed] = await Promise.all([
    viewerKey && stream.status === "LIVE" ? touchViewer(id, viewerKey) : Promise.resolve(0),
    valid
      ? db.chatMessage.findMany({
          // Small overlap so two messages created in the same millisecond are never skipped; the client de-duplicates by id.
          where: { streamId: id, deleted: false, createdAt: { gt: new Date(after!.getTime() - 2000) } },
          orderBy: { createdAt: "asc" }, take: 100, include: { author: { select: authorSelect } },
        })
      : db.chatMessage.findMany({
          where: { streamId: id, deleted: false },
          orderBy: { createdAt: "desc" }, take: 50, include: { author: { select: authorSelect } },
        }).then((r) => r.reverse()),
    db.chatMessage.findMany({
      where: { streamId: id, deleted: true, createdAt: { gt: new Date(Date.now() - 10 * 60_000) } },
      select: { id: true },
    }),
  ]);

  const messages: ChatMsg[] = rows.map((m) => ({ id: m.id, body: m.body, createdAt: m.createdAt.toISOString(), author: toAuthor(m.author) }));
  return json({ messages, removed: removed.map((r) => r.id), status: stream.status, viewers });
}

export async function POST(req: Request, { params }: Ctx) {
  const { t } = await getT();
  const me = await getUser();
  if (!me) return json({ error: t("err.login") }, 401);
  const { id } = await params;

  const stream = await db.liveStream.findUnique({ where: { id }, select: { status: true, creatorId: true } });
  if (!stream) return json({ error: "Not found" }, 404);
  if (stream.status !== "LIVE") return json({ error: t("err.notLive") }, 409);

  const p = z.object({ body: z.string().trim().min(1).max(300) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return json({ error: t("err.msgInvalid") }, 400);

  if (stream.creatorId !== me.id) {
    const banned = await db.chatBan.findUnique({ where: { creatorId_userId: { creatorId: stream.creatorId, userId: me.id } } });
    if (banned) return json({ error: t("err.banned") }, 403);
  }
  const last = await db.chatMessage.findFirst({ where: { streamId: id, authorId: me.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
  if (last && Date.now() - last.createdAt.getTime() < CHAT_GAP_MS) return json({ error: t("err.slow") }, 429);

  const m = await db.chatMessage.create({ data: { streamId: id, authorId: me.id, body: p.data.body }, include: { author: { select: authorSelect } } });
  const message: ChatMsg = { id: m.id, body: m.body, createdAt: m.createdAt.toISOString(), author: toAuthor(m.author) };
  return json({ message });
}
