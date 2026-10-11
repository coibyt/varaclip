import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { viewerCount } from "@/lib/live";

/** The broadcaster page pings this every ~20 s; without pings the stream is closed automatically. */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const s = await db.liveStream.findUnique({ where: { id }, select: { creatorId: true, status: true } });
  if (!s || s.creatorId !== me.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (s.status !== "LIVE") return NextResponse.json({ status: s.status, viewers: 0 });
  await db.liveStream.update({ where: { id }, data: { lastBeat: new Date() } });
  return NextResponse.json({ status: "LIVE", viewers: await viewerCount(id) });
}
