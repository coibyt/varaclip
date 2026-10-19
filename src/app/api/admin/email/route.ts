import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { escapeHtml, mailConfigured, sendMail, textToHtml, unsubscribeUrl } from "@/lib/mail";
import { marketingMail } from "@/lib/mails";

const BATCH = 20;
const GAP_MS = 400; // gentle pace: mail servers limit how fast and how many emails an account may send

const schema = z.object({
  subject: z.string().trim().min(3).max(150),
  body: z.string().trim().min(5).max(8000),
  mode: z.enum(["test", "all"]),
  offset: z.number().int().min(0).default(0),
  buttonLabel: z.string().trim().max(40).optional(),
  buttonUrl: z.string().trim().max(500).optional(),
});

async function guard() {
  const me = await getUser();
  return isAdminUser(me) ? me : null;
}

/** How many customers agreed to marketing email. */
export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const recipients = await db.userConsent.count({ where: { marketingEmail: true } }).catch(() => null);
  return NextResponse.json({ recipients, configured: mailConfigured() });
}

/** Sends a test email to the admin, or one batch of the marketing email to the customers who agreed to receive it. */
export async function POST(req: Request) {
  const me = await guard();
  if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!mailConfigured()) return NextResponse.json({ error: "Chưa cấu hình SMTP trong Hostinger (SMTP_HOST, SMTP_USER, SMTP_PASS)." }, { status: 500 });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Tiêu đề (từ 3 ký tự) và nội dung (từ 5 ký tự) là bắt buộc." }, { status: 400 });
  const { subject, body, mode, offset } = p.data;
  const html = textToHtml(body);
  // An optional button: both fields are needed and the link must be an https address.
  const button = p.data.buttonLabel && p.data.buttonUrl && /^https:\/\//i.test(p.data.buttonUrl) ? { label: p.data.buttonLabel, url: p.data.buttonUrl } : undefined;
  if ((p.data.buttonLabel || p.data.buttonUrl) && !button) return NextResponse.json({ error: "Nút bấm cần cả chữ trên nút và một link bắt đầu bằng https://" }, { status: 400 });

  if (mode === "test") {
    const r = await sendMail(marketingMail(me.email, `[Thử] ${subject}`, html, body, unsubscribeUrl(me.id), { name: me.displayName, button }));
    return r.ok ? NextResponse.json({ ok: true, sent: 1, failed: 0, done: true, to: me.email }) : NextResponse.json({ error: r.error }, { status: 502 });
  }

  const where = { marketingEmail: true };
  const [total, consents] = await Promise.all([
    db.userConsent.count({ where }),
    db.userConsent.findMany({ where, orderBy: { userId: "asc" }, skip: offset, take: BATCH, select: { userId: true } }),
  ]);
  const users = await db.user.findMany({ where: { id: { in: consents.map((c) => c.userId) } }, select: { id: true, email: true, displayName: true } });

  let sent = 0;
  const errors: string[] = [];
  for (const u of users) {
    const r = await sendMail(marketingMail(u.email, subject, html, body, unsubscribeUrl(u.id), { name: u.displayName, button }));
    if (r.ok) sent++;
    else errors.push(`${u.email}: ${escapeHtml(r.error).slice(0, 120)}`);
    await new Promise((ok) => setTimeout(ok, GAP_MS));
  }
  const next = offset + consents.length;
  return NextResponse.json({ ok: true, sent, failed: errors.length, errors: errors.slice(0, 3), total, nextOffset: next, done: next >= total || consents.length === 0 });
}
