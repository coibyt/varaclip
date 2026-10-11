import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { closeStaleStreams, createLiveInput, endStream, liveConfigured, viewerCount } from "@/lib/live";
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
      startedAt: s.startedAt.toISOString(),
      viewers: await viewerCount(s.id),
      creator: { ...s.creator, avatarUrl: mediaUrl(s.creator.avatarKey) },
    })),
  );
  return json({ streams });
}

/** A salon starts a broadcast: creates the Cloudflare live input and returns the publish URL (owner only). */
export async function POST(req: Request) {
  const { t } = await getT();
  const me = await getUser();
  if (!me) return json({ error: t("err.login") }, 401);
  if (!me.isSalon) return json({ error: t("err.salonOnly") }, 403);
  if (!liveConfigured()) return json({ error: t("err.liveOff") }, 503);

  const p = z.object({ title: z.string().trim().max(120).default("") }).safeParse(await req.json().catch(() => null));
  if (!p.success) return json({ error: t("err.invalid") }, 400);

  // One broadcast at a time per salon: close any earlier one first.
  const open = await db.liveStream.findMany({ where: { creatorId: me.id, status: "LIVE" }, select: { id: true, cfInputId: true } });
  await Promise.all(open.map((s) => endStream(s.id, s.cfInputId)));

  let input;
  try {
    input = await createLiveInput(p.data.title || me.salonName || me.displayName);
  } catch {
    return json({ error: t("err.liveFail") }, 502);
  }
  const stream = await db.liveStream.create({
    data: { creatorId: me.id, title: p.data.title, cfInputId: input.uid, whipUrl: input.whipUrl },
  });
  return json({ id: stream.id, whipUrl: input.whipUrl });
}
