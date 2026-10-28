import { NextResponse } from "next/server";
import { authenticateApi } from "@/lib/api-keys";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://varaclip.com").replace(/\/$/, "");

/** API: who owns this key. */
export async function GET(req: Request) {
  const a = await authenticateApi(req);
  if ("res" in a) return a.res;
  const u = a.user;
  return NextResponse.json({ id: u.id, handle: u.handle, name: u.salonName || u.displayName, is_salon: u.isSalon, profile_url: `${SITE}/u/${u.handle}` });
}
