import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { HOST_GONE_MS, hostSeen, iceServers, markHost, pushSignal, readSignals } from "@/lib/rtc";

const json = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { "Cache-Control": "no-store" } });
const KEY = /^[a-z0-9]{6,40}$/;

async function loadStream(id: string) {
  const s = await db.liveStream.findUnique({ where: { id }, select: { status: true, platform: true, creatorId: true } });
  return s && s.platform === "camera" ? s : null;
}

/** Poll for handshake messages addressed to `key` ("host" for the salon, a random id for each viewer). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = new URL(req.url);
  const key = u.searchParams.get("key") ?? "";
  const after = Number(u.searchParams.get("after")) || 0;
  const s = await loadStream(id);
  if (!s) return json({ error: "Not found" }, 404);

  if (key === "host") {
    const me = await getUser();
    if (!me || me.id !== s.creatorId) return json({ error: "Forbidden" }, 403);
    markHost(id);
  } else if (!KEY.test(key)) {
    return json({ error: "Bad key" }, 400);
  }

  const msgs = readSignals(id, key, after);
  return json({
    status: s.status,
    msgs,
    hostOnline: Date.now() - (hostSeen(id) ?? 0) < HOST_GONE_MS,
    ice: iceServers(),
  });
}

/** Send a handshake message to the other side. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await req.text();
  if (raw.length > 12_000) return json({ error: "Too large" }, 413);
  const p = z
    .object({ from: z.string().regex(/^(host|[a-z0-9]{6,40})$/), to: z.string().regex(/^(host|[a-z0-9]{6,40})$/), data: z.record(z.string(), z.unknown()) })
    .safeParse((() => { try { return JSON.parse(raw); } catch { return null; } })());
  if (!p.success) return json({ error: "Bad request" }, 400);

  const s = await loadStream(id);
  if (!s || s.status !== "LIVE") return json({ error: "Not live" }, 404);

  if (p.data.from === "host") {
    const me = await getUser();
    if (!me || me.id !== s.creatorId) return json({ error: "Forbidden" }, 403);
  } else if (p.data.to !== "host") {
    return json({ error: "Forbidden" }, 403); // viewers only talk to the host
  }

  pushSignal(id, p.data.to, p.data.from, p.data.data);
  return json({ ok: true });
}
