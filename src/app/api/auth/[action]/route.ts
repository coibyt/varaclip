import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkPassword, createSession, destroySession, hashPassword } from "@/lib/auth";
import { HANDLE_RE } from "@/lib/util";

const registerSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(100),
  displayName: z.string().trim().min(2).max(50),
  handle: z.string().trim().toLowerCase().regex(HANDLE_RE),
  isSalon: z.boolean().default(false),
  salonName: z.string().trim().max(80).default(""),
  city: z.string().trim().max(60).default(""),
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;

  if (action === "logout") {
    await destroySession();
    return NextResponse.json({ ok: true });
  }

  const body = await req.json().catch(() => null);

  if (action === "register") {
    const p = registerSchema.safeParse(body);
    if (!p.success) {
      const bad = p.error.issues[0]?.path[0];
      const msg: Record<string, string> = {
        email: "Email không hợp lệ.",
        password: "Mật khẩu cần ít nhất 8 ký tự.",
        displayName: "Tên hiển thị cần 2–50 ký tự.",
        handle: "Tên người dùng gồm 3–24 ký tự: chữ thường, số, dấu _ hoặc dấu chấm.",
      };
      return err(msg[String(bad)] ?? "Thông tin chưa hợp lệ.");
    }
    const d = p.data;
    if (d.isSalon && !d.salonName) return err("Vui lòng nhập tên salon.");
    const email = d.email.toLowerCase();
    if (await db.user.findUnique({ where: { email } })) return err("Email này đã được đăng ký.", 409);
    if (await db.user.findUnique({ where: { handle: d.handle } })) return err("Tên người dùng đã có người dùng.", 409);
    const user = await db.user.create({
      data: {
        email, passwordHash: await hashPassword(d.password), displayName: d.displayName, handle: d.handle,
        isSalon: d.isSalon, salonName: d.salonName, city: d.city, hue: Math.floor(Math.random() * 360),
      },
    });
    await createSession(user.id);
    return NextResponse.json({ ok: true, handle: user.handle });
  }

  if (action === "login") {
    const p = loginSchema.safeParse(body);
    if (!p.success) return err("Vui lòng nhập email và mật khẩu.");
    const user = await db.user.findUnique({ where: { email: p.data.email.toLowerCase() } });
    // Same message for unknown email and wrong password, to avoid account enumeration.
    if (!user || !(await checkPassword(p.data.password, user.passwordHash))) return err("Email hoặc mật khẩu không đúng.", 401);
    await createSession(user.id);
    return NextResponse.json({ ok: true, handle: user.handle });
  }

  return err("Not found", 404);
}
