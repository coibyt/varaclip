import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { LIVE_MIN_FOLLOWERS, closeStaleStreams, endStream, parseLiveUrl, thumbUrl, viewerCount } from "@/lib/live";
import { mediaUrl } from "@/lib/storage";

const json = (b: unknown, status = 200) => NextResponse.json(b, { status });

/** Public: who is live right now. */
export async function GET() {
  await closeStaleStreams();
  const rows = await db.liveStream.findMany({
    where: { status: "LIVE" },
    orderBy: { startedAt: "desc" },
    take: 30,
    include: { creator: { select: { handle: true, displayName: true, salonName: true, city: true, hue: true, avatarKey: true } } },
  });
  const streams = await Promise.all(
    rows.map(async (s) => ({
      id: s.id,
      title: s.title,
      platform: s.platform,
      thumb: thumbUrl(s),
      startedAt: s.startedAt.toISOString(),
      viewers: await viewerCount(s.id),
      creator: { ...s.creator, avatarUrl: mediaUrl(s.creator.avatarKey) },
    })),
  );
  return json({ streams });
}

/** A salon announces that it is live: it pastes the link of the live from YouTube / Facebook / TikTok. */
export async function POST(req: Request) {
  const { t } = await getT();
  const me = await getUser();
  if (!me) return json({ error: t("err.login") }, 401);
  if (!me.isSalon) return json({ error: t("err.salonOnly") }, 403);

  const followers = await db.follow.count({ where: { followingId: me.id } });
  if (followers < LIVE_MIN_FOLLOWERS) return json({ error: t("go.gateBody", { need: LIVE_MIN_FOLLOWERS, count: followers }) }, 403);

  const p = z.object({ title: z.string().trim().max(120).default(""), url: z.string().trim().min(8).max(600) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return json({ error: t("err.badLiveUrl") }, 400);

  const src = parseLiveUrl(p.data.url);
  if ("error" in src) return json({ error: src.error === "channel" ? t("err.liveChannelLink") : t("err.badLiveUrl") }, 400);

  // One broadcast at a time per salon: close any earlier one first.
  const open = await db.liveStream.findMany({ where: { creatorId: me.id, status: "LIVE" }, select: { id: true } });
  await Promise.all(open.map((s) => endStream(s.id)));

  const stream = await db.liveStream.create({
    data: { creatorId: me.id, title: p.data.title, platform: src.platform, sourceUrl: src.sourceUrl, embedId: src.embedId },
  });
  return json({ id: stream.id });
}
