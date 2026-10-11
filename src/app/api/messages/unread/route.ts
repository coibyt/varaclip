import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";

export async function GET() {
  const me = await getUser();
  if (!me) return NextResponse.json({ count: 0 });
  return NextResponse.json({ count: await db.directMessage.count({ where: { recipientId: me.id, readAt: null } }) });
}
