import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { AUTOMATIONS, lastRun, loadConfigs, runAutomations, saveConfig, sendTest } from "@/lib/automations";
import { mailConfigured } from "@/lib/mail";

const NOT_READY = "Chưa có bảng email tự động: chạy file SQL database-automations.sql trong phpMyAdmin.";

/** Admin: settings, numbers and the latest sends of every automation. */
export async function GET() {
  if (!isAdminUser(await getUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const since = new Date(Date.now() - 30 * 24 * 3600_000);
    const [configs, sent, due, recent, run] = await Promise.all([
      loadConfigs(),
      db.emailAutomationSend.groupBy({ by: ["automation"], where: { sentAt: { gt: since }, status: "sent" }, _count: { _all: true } }),
      runAutomations({ onlyCount: true }),
      db.emailAutomationSend.findMany({ orderBy: { sentAt: "desc" }, take: 40 }),
      lastRun(),
    ]);
    const emails = new Map(
      (await db.user.findMany({ where: { id: { in: recent.map((r) => r.userId) } }, select: { id: true, email: true } })).map((u) => [u.id, u.email]),
    );
    return NextResponse.json({
      mailConfigured: mailConfigured(),
      lastRun: run,
      automations: configs.map((c) => ({ ...c, sent30: sent.find((s) => s.automation === c.key)?._count._all ?? 0, dueNow: due.byKey[c.key] ?? 0 })),
      recent: recent.map((r) => ({ id: r.id, automation: r.automation, email: emails.get(r.userId) ?? "?", status: r.status, error: r.error, sentAt: r.sentAt })),
    });
  } catch {
    return NextResponse.json({ error: NOT_READY }, { status: 503 });
  }
}

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save"), key: z.string(), enabled: z.boolean(),
    subject: z.string().trim().min(3).max(150), body: z.string().trim().min(5).max(5000),
    buttonLabel: z.string().trim().max(40), delayDays: z.number().int().min(1).max(365),
  }),
  z.object({ action: z.literal("test"), key: z.string() }),
  z.object({ action: z.literal("run") }),
]);

/** Admin: save one automation, send yourself a test, or run everything that is due now. */
export async function POST(req: Request) {
  const me = await getUser();
  if (!me || !isAdminUser(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Tiêu đề (từ 3 ký tự), nội dung (từ 5 ký tự) và số ngày (1–365) là bắt buộc." }, { status: 400 });
  try {
    if (p.data.action === "save") {
      const { action: _a, key, ...c } = p.data;
      void _a;
      if (!AUTOMATIONS.some((a) => a.key === key)) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await saveConfig(key, c);
      return NextResponse.json({ ok: true });
    }
    if (!mailConfigured()) return NextResponse.json({ error: "Chưa cấu hình gửi email (SMTP) trong Hostinger." }, { status: 500 });
    const data = p.data;
    if (data.action === "test") {
      const r = await sendTest(data.key, me.id);
      return r.ok ? NextResponse.json({ ok: true, to: me.email }) : NextResponse.json({ error: r.error }, { status: 502 });
    }
    return NextResponse.json({ ok: true, ...(await runAutomations()) });
  } catch {
    return NextResponse.json({ error: NOT_READY }, { status: 503 });
  }
}
