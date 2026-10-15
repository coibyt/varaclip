import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { helsinkiDay, markOnline } from "@/lib/online";

const schema = z.object({ key: z.string().regex(/^[a-z0-9]{8,40}$/), type: z.enum(["view", "beat"]) });
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse/i;

function platformOf(ua: string) {
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  if (/windows|macintosh|linux|cros/i.test(ua)) return "desktop";
  return "other";
}

/** Page view / still-here ping from the browser, used for the admin traffic statistics. */
export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") ?? "";
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success || BOT.test(ua)) return NextResponse.json({ ok: true });

  markOnline(p.data.key);
  if (p.data.type === "view") {
    try {
      const me = await getUser();
      const day = helsinkiDay();
      await db.siteVisit.upsert({
        where: { day_visitorKey: { day, visitorKey: p.data.key } },
        update: { views: { increment: 1 }, ...(me ? { userId: me.id } : {}) },
        create: { day, visitorKey: p.data.key, userId: me?.id ?? null, platform: platformOf(ua) },
      });
    } catch {
      // Counting must never break the site (for example before the table has been created).
    }
  }
  return NextResponse.json({ ok: true });
}
