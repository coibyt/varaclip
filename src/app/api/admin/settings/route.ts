import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { mailConfigured } from "@/lib/mail";
import { getFlag, setFlag } from "@/lib/settings";

async function guard() {
  return isAdminUser(await getUser());
}

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ requireEmailVerify: await getFlag("requireEmailVerify"), mailConfigured: mailConfigured() });
}

/** Admin: turn "confirm your email before the account is created" on or off. */
export async function POST(req: Request) {
  if (!(await guard())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const p = z.object({ requireEmailVerify: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  if (p.data.requireEmailVerify && !mailConfigured()) {
    return NextResponse.json({ error: "Chưa cấu hình gửi email (SMTP) trong Hostinger nên chưa thể bật xác nhận email." }, { status: 400 });
  }
  try {
    await setFlag("requireEmailVerify", p.data.requireEmailVerify);
  } catch {
    return NextResponse.json({ error: "Chưa có bảng cài đặt: chạy file SQL database-email.sql trong phpMyAdmin." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, requireEmailVerify: p.data.requireEmailVerify });
}
