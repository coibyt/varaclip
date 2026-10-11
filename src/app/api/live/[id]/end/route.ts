import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { endStream } from "@/lib/live";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const s = await db.liveStream.findUnique({ where: { id: (await params).id }, select: { id: true, creatorId: true } });
  if (!s || s.creatorId !== me.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await endStream(s.id);
  return NextResponse.json({ ok: true });
}
