import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkUnsubscribe } from "@/lib/mail";

/** Stops marketing emails for one account (the link in the email is signed, so only its owner can use it). */
export async function POST(req: Request) {
  const p = z.object({ u: z.string().min(5).max(60), t: z.string().min(10).max(64) }).safeParse(await req.json().catch(() => null));
  if (!p.success || !checkUnsubscribe(p.data.u, p.data.t)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await db.userConsent.updateMany({ where: { userId: p.data.u }, data: { marketingEmail: false } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
