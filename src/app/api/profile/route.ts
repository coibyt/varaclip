import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { isOwnKey, deleteObject, newKey, uploadTarget, MAX_IMAGE_BYTES } from "@/lib/storage";

const schema = z.object({
  displayName: z.string().trim().min(2).max(50),
  bio: z.string().trim().max(200).default(""),
  salonName: z.string().trim().max(80).default(""),
  city: z.string().trim().max(60).default(""),
  phone: z.string().trim().max(30).default(""),
  bookingUrl: z.string().trim().max(300).default("").refine((u) => u === "" || /^https?:\/\//.test(u), "URL phải bắt đầu bằng http:// hoặc https://"),
  avatarKey: z.string().optional(),
});

export async function PATCH(req: Request) {
  const me = await getUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message ?? "Không hợp lệ" }, { status: 400 });
  const { avatarKey, ...rest } = p.data;
  if (avatarKey && (!isOwnKey(avatarKey) || !avatarKey.startsWith("avatars/"))) {
    return NextResponse.json({ error: "Khoá ảnh không hợp lệ." }, { status: 400 });
  }
  await db.user.update({ where: { id: me.id }, data: { ...rest, ...(avatarKey ? { avatarKey } : {}) } });
  if (avatarKey && me.avatarKey && me.avatarKey !== avatarKey) await deleteObject(me.avatarKey);
  return NextResponse.json({ ok: true });
}

// Presign an avatar upload.
export async function PUT(req: Request) {
  const me = await getUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => null);
  const type = String(b?.type ?? "");
  if (!["image/jpeg", "image/png", "image/webp"].includes(type) || !(Number(b?.size) <= MAX_IMAGE_BYTES)) {
    return NextResponse.json({ error: "Ảnh JPG/PNG/WebP, tối đa 5MB." }, { status: 400 });
  }
  const key = newKey("avatar", type);
  return NextResponse.json({ key, target: await uploadTarget(key, type) });
}
