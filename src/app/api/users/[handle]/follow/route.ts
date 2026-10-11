import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";

export async function POST(_: Request, { params }: { params: Promise<{ handle: string }> }) {
  const me = await getUser();
  if (!me) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  const target = await db.user.findUnique({ where: { handle: (await params).handle } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.id === me.id) return NextResponse.json({ error: "Không thể tự theo dõi." }, { status: 400 });

  const key = { followerId_followingId: { followerId: me.id, followingId: target.id } };
  const existing = await db.follow.findUnique({ where: key });
  if (existing) await db.follow.delete({ where: key });
  else await db.follow.create({ data: { followerId: me.id, followingId: target.id } });
  const followers = await db.follow.count({ where: { followingId: target.id } });
  return NextResponse.json({ following: !existing, followers });
}
