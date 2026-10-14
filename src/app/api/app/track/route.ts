import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";

const schema = z.object({ key: z.string().regex(/^[a-z0-9]{8,40}$/), kind: z.enum(["installed", "opened"]) });

function platformOf(ua: string) {
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  if (/windows|macintosh|linux|cros/i.test(ua)) return "desktop";
  return "other";
}

/** The app reports once per device when it gets installed and when it is first opened as an app. */
export async function POST(req: Request) {
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const exists = await db.appInstall.findFirst({ where: { deviceKey: p.data.key, kind: p.data.kind }, select: { id: true } });
    if (!exists) {
      const me = await getUser();
      await db.appInstall.create({
        data: { deviceKey: p.data.key, kind: p.data.kind, platform: platformOf(req.headers.get("user-agent") ?? ""), userId: me?.id ?? null },
      });
    }
  } catch {
    // Counting must never break the app (for example before the table has been created).
  }
  return NextResponse.json({ ok: true });
}
