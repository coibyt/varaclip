import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { createSchema, presignSchema, presignUpload, registerVideo } from "@/lib/video-create";

const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/** Step 1 — ask for presigned upload targets for the video (and its poster frame). */
export async function PUT(req: Request) {
  const { t } = await getT();
  const me = await getUser();
  if (!me) return err(t("err.login"), 401);
  if (!me.isSalon) return err(t("err.salonOnly"), 403);
  const p = presignSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return err(t("err.badRequest"));
  const r = await presignUpload(p.data);
  return r.ok ? NextResponse.json(r.data) : err(t(`err.${r.code}`));
}

/** Step 2 — after the browser finished uploading, register the video. */
export async function POST(req: Request) {
  const { t } = await getT();
  const me = await getUser();
  if (!me) return err(t("err.login"), 401);
  if (!me.isSalon) return err(t("err.salonOnly"), 403);
  const p = createSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return err(t("err.videoInfo"));
  const r = await registerVideo(me.id, p.data);
  return r.ok ? NextResponse.json({ id: r.id }) : err(t(`err.${r.code}`));
}
