import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { MAX_KEYS, createApiKey, listApiKeys } from "@/lib/api-keys";

const NOT_READY = "Chưa có bảng ApiKey: chạy file SQL database-api-keys.sql trong phpMyAdmin.";

/** Settings: the signed-in salon's API keys (never the keys themselves, only their first characters). */
export async function GET() {
  const me = await getUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const keys = await listApiKeys(me.id).catch(() => null);
  if (!keys) return NextResponse.json({ error: NOT_READY }, { status: 503 });
  return NextResponse.json({ keys });
}

/** Settings: create a key; the full key is in this response only. */
export async function POST(req: Request) {
  const { t } = await getT();
  const me = await getUser();
  if (!me) return NextResponse.json({ error: t("err.login") }, { status: 401 });
  if (!me.isSalon) return NextResponse.json({ error: t("err.salonOnly") }, { status: 403 });
  const p = z.object({ name: z.string().max(60).default("") }).safeParse(await req.json().catch(() => ({})));
  const r = await createApiKey(me.id, p.success ? p.data.name : "").catch(() => null);
  if (!r) return NextResponse.json({ error: NOT_READY }, { status: 503 });
  if ("error" in r) return NextResponse.json({ error: t("api.tooMany", { n: MAX_KEYS }) }, { status: 400 });
  return NextResponse.json({ key: r.key });
}
