import { db } from "./db";
import { escapeHtml, mailConfigured, sendMail, SITE_URL, textToHtml, unsubscribeUrl } from "./mail";
import { emailShell } from "./email-shell";
import { mediaUrl } from "./storage";

/**
 * Automatic customer-care emails ("email marketing tự động").
 * Each automation finds the people it is meant for (only those who agreed to marketing email at sign-up),
 * sends each person at most once per period, and can be switched on/off and reworded by an admin.
 * Runs about once an hour, started by normal site traffic (see maybeRunAutomations), no cron job needed.
 */

export type Audience = "customer" | "salon";
type Period = "once" | "week" | "month";
type Block = "none" | "hot" | "following" | "new" | "stats";

export type AutomationDef = {
  key: string;
  audience: Audience;
  name: string;
  when: string;
  period: Period;
  block: Block;
  url: string;
  delayDays: number;
  subject: string;
  body: string;
  buttonLabel: string;
};

export const AUTOMATIONS: AutomationDef[] = [
  {
    key: "customer_explore", audience: "customer", name: "Khách mới: gợi ý video đang hot", when: "{delay} ngày sau khi khách đăng ký (1 lần)",
    period: "once", block: "hot", url: "/", delayDays: 3,
    subject: "{name} ơi, xem ngay những video làm đẹp đang hot 🔥",
    body: "Chào {name},\n\nCảm ơn bạn đã tham gia VaraClip! Đây là vài video làm đẹp được yêu thích nhất tuần này. Xem thử, thả tim và theo dõi salon bạn thích để không bỏ lỡ video mới nhé.",
    buttonLabel: "Xem video đang hot",
  },
  {
    key: "customer_digest", audience: "customer", name: "Video mới từ salon khách đang theo dõi", when: "Mỗi tuần, khi salon khách theo dõi có video mới",
    period: "week", block: "following", url: "/", delayDays: 7,
    subject: "Salon bạn theo dõi vừa đăng {count} video mới",
    body: "Chào {name},\n\nTuần này các salon bạn theo dõi đã đăng {count} video mới. Xem ngay và đặt lịch nếu bạn thích kiểu nào nhé!",
    buttonLabel: "Xem video mới",
  },
  {
    key: "customer_winback", audience: "customer", name: "Khách lâu không quay lại", when: "Khi khách không vào VaraClip {delay} ngày (tối đa 1 lần mỗi tháng)",
    period: "month", block: "new", url: "/", delayDays: 14,
    subject: "Lâu rồi không gặp, {name}! Có {count} video mới đang chờ bạn",
    body: "Chào {name},\n\nĐã lâu bạn chưa ghé VaraClip. Trong thời gian đó các salon đã đăng {count} video mới: tóc, nail, mi, chăm sóc da và nhiều hơn nữa. Quay lại xem nhé!",
    buttonLabel: "Quay lại VaraClip",
  },
  {
    key: "salon_first_video", audience: "salon", name: "Salon mới chưa đăng video", when: "{delay} ngày sau khi salon đăng ký mà chưa có video (1 lần)",
    period: "once", block: "none", url: "/upload", delayDays: 2,
    subject: "{salon}: đăng video đầu tiên chỉ trong 1 phút",
    body: "Chào {name},\n\nSalon của bạn đã có trang trên VaraClip nhưng chưa có video nào. Hãy quay kết quả làm đẹp của khách (nhớ xin phép khách), thêm nhạc và chữ ngay trong ứng dụng, chọn danh mục rồi đăng. Video đầu tiên giúp khách mới tìm thấy salon của bạn!",
    buttonLabel: "Đăng video đầu tiên",
  },
  {
    key: "salon_booking_link", audience: "salon", name: "Salon chưa có link đặt lịch", when: "{delay} ngày sau khi đăng ký, nếu salon chưa có link đặt lịch hay số điện thoại (1 lần)",
    period: "once", block: "none", url: "/settings", delayDays: 3,
    subject: "{salon}: để khách đặt lịch ngay trên video của bạn",
    body: "Chào {name},\n\nKhách xem video xong thường muốn đặt lịch ngay, nhưng salon của bạn chưa có link đặt lịch. Tạo trang đặt lịch miễn phí trên VaraaAi.com rồi dán link vào Cài đặt: nút \"Đặt lịch\" sẽ hiện trên mọi video của bạn.",
    buttonLabel: "Thêm link đặt lịch",
  },
  {
    key: "salon_inactive", audience: "salon", name: "Salon lâu không đăng video", when: "Khi salon không đăng video mới {delay} ngày (tối đa 1 lần mỗi tháng)",
    period: "month", block: "none", url: "/upload", delayDays: 14,
    subject: "{salon}: khách đang chờ video mới của bạn",
    body: "Chào {name},\n\nĐã {days} ngày salon chưa đăng video mới. Salon đăng video đều đặn mỗi tuần thường có nhiều lượt xem và lượt đặt lịch hơn. Hôm nay bạn có kết quả đẹp nào của khách để chia sẻ không?",
    buttonLabel: "Đăng video mới",
  },
  {
    key: "salon_weekly_report", audience: "salon", name: "Báo cáo tuần cho salon", when: "Mỗi tuần một lần, nếu salon đã có video",
    period: "week", block: "stats", url: "/studio", delayDays: 7,
    subject: "{salon}: kết quả tuần qua trên VaraClip",
    body: "Chào {name},\n\nĐây là kết quả của salon trên VaraClip trong 7 ngày qua. Cảm ơn bạn đã đồng hành cùng VaraClip!",
    buttonLabel: "Mở Studio",
  },
];

const DAY = 24 * 3600_000;
const MAX_PER_RUN = 60; // stay well under the mail server's hourly limit
const GAP_MS = 400;
const RUN_EVERY_MS = 3600_000;
const LOCK_KEY = "automationsLastRun";

// ── admin settings (the EmailAutomation table holds only what the admin changed)
export type AutomationConfig = AutomationDef & { enabled: boolean };

export async function loadConfigs(): Promise<AutomationConfig[]> {
  const rows = await db.emailAutomation.findMany();
  return AUTOMATIONS.map((d) => {
    const r = rows.find((x) => x.key === d.key);
    return r
      ? { ...d, enabled: r.enabled, subject: r.subject || d.subject, body: r.body || d.body, buttonLabel: r.buttonLabel, delayDays: r.delayDays }
      : { ...d, enabled: false };
  });
}

export async function saveConfig(key: string, c: { enabled: boolean; subject: string; body: string; buttonLabel: string; delayDays: number }) {
  await db.emailAutomation.upsert({ where: { key }, update: c, create: { key, ...c } });
}

// ── who gets what
type Person = { id: string; email: string; displayName: string; salonName: string; isSalon: boolean; bookingUrl: string; phone: string; createdAt: Date };
type Ctx = { count?: number; days?: number; videos?: VideoCard[]; stats?: Stats };
type VideoCard = { id: string; thumb: string; caption: string; salon: string };
type Stats = { followers: number; likes: number; comments: number; videos: number; views: number };

const isoWeek = (d: Date) => {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const year = t.getUTCFullYear();
  const week = Math.ceil(((t.getTime() - Date.UTC(year, 0, 1)) / DAY + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
};
const periodKey = (p: Period, now: Date) => (p === "once" ? "once" : p === "week" ? isoWeek(now) : now.toISOString().slice(0, 7));

const absolute = (u: string) => (u.startsWith("/") ? `${SITE_URL}${u}` : u);

async function cards(where: object, take = 3): Promise<VideoCard[]> {
  const rows = await db.video.findMany({
    where, orderBy: { createdAt: "desc" }, take,
    select: { id: true, thumbKey: true, caption: true, creator: { select: { salonName: true, displayName: true } } },
  });
  return rows.map((v) => ({ id: v.id, thumb: absolute(mediaUrl(v.thumbKey)), caption: v.caption, salon: v.creator.salonName || v.creator.displayName }));
}

async function hotCards(): Promise<VideoCard[]> {
  const since = new Date(Date.now() - 7 * DAY);
  const top = await db.like.groupBy({ by: ["videoId"], where: { createdAt: { gt: since } }, _count: { _all: true }, orderBy: { _count: { videoId: "desc" } }, take: 3 });
  if (top.length >= 3) return cards({ id: { in: top.map((t) => t.videoId) } });
  return cards({});
}

/** The context for one person, or null when the automation is not for them right now. */
async function eligible(def: AutomationConfig, p: Person, now: Date, hot: () => Promise<VideoCard[]>): Promise<Ctx | null> {
  const delay = def.delayDays * DAY;
  const age = now.getTime() - p.createdAt.getTime();
  switch (def.key) {
    case "customer_explore":
      if (p.isSalon || age < delay || age > delay + 7 * DAY) return null;
      return { videos: await hot() };
    case "customer_digest": {
      if (p.isSalon) return null;
      const where = { creator: { followers: { some: { followerId: p.id } } }, createdAt: { gt: new Date(now.getTime() - 7 * DAY) } };
      const count = await db.video.count({ where });
      return count ? { count, videos: await cards(where) } : null;
    }
    case "customer_winback": {
      if (p.isSalon || age < delay) return null;
      const last = await db.siteVisit.findFirst({ where: { userId: p.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }).catch(() => null);
      const seen = last?.createdAt ?? p.createdAt;
      if (now.getTime() - seen.getTime() < delay) return null;
      const where = { createdAt: { gt: seen } };
      const count = await db.video.count({ where });
      return count ? { count, videos: await cards(where) } : null;
    }
    case "salon_first_video":
      if (!p.isSalon || age < delay || age > delay + 14 * DAY) return null;
      return (await db.video.count({ where: { creatorId: p.id } })) === 0 ? {} : null;
    case "salon_booking_link":
      if (!p.isSalon || p.bookingUrl || p.phone || age < delay || age > delay + 14 * DAY) return null;
      return {};
    case "salon_inactive": {
      if (!p.isSalon) return null;
      const last = await db.video.findFirst({ where: { creatorId: p.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
      if (!last || now.getTime() - last.createdAt.getTime() < delay) return null;
      return { days: Math.floor((now.getTime() - last.createdAt.getTime()) / DAY) };
    }
    case "salon_weekly_report": {
      if (!p.isSalon) return null;
      const since = new Date(now.getTime() - 7 * DAY);
      const [videos, views, followers, likes, comments] = await Promise.all([
        db.video.count({ where: { creatorId: p.id } }),
        db.video.aggregate({ where: { creatorId: p.id }, _sum: { views: true } }),
        db.follow.count({ where: { followingId: p.id, createdAt: { gt: since } } }),
        db.like.count({ where: { video: { creatorId: p.id }, createdAt: { gt: since } } }),
        db.comment.count({ where: { video: { creatorId: p.id }, createdAt: { gt: since } } }),
      ]);
      if (!videos) return null;
      return { stats: { videos, views: views._sum.views ?? 0, followers, likes, comments } };
    }
  }
  return null;
}

// ── the email
function fill(s: string, p: Person, ctx: Ctx, delayDays: number) {
  return s
    .replace(/\{name\}/g, p.displayName)
    .replace(/\{salon\}/g, p.salonName || p.displayName)
    .replace(/\{count\}/g, String(ctx.count ?? ""))
    .replace(/\{days\}/g, String(ctx.days ?? ""))
    .replace(/\{delay\}/g, String(delayDays));
}

function videoBlock(videos: VideoCard[]) {
  if (!videos.length) return "";
  const cell = (v: VideoCard) => `<td width="33%" valign="top" style="padding:4px">
    <a href="${SITE_URL}/v/${v.id}" style="text-decoration:none;color:#1D1D27">
      ${v.thumb ? `<img src="${v.thumb}" alt="" width="160" style="display:block;width:100%;max-width:160px;aspect-ratio:3/4;object-fit:cover;border-radius:12px;background:#eee">` : `<div style="height:200px;border-radius:12px;background:#eee"></div>`}
      <p style="margin:6px 0 0;font-size:12px;font-weight:700;line-height:1.3">${escapeHtml(v.salon)}</p>
      <p style="margin:2px 0 0;font-size:12px;line-height:1.35;color:#6B6B7B">${escapeHtml(v.caption.slice(0, 60))}</p>
    </a></td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px"><tr>${videos.slice(0, 3).map(cell).join("")}</tr></table>`;
}

function statsBlock(s: Stats) {
  const item = (n: number, label: string) => `<td align="center" style="padding:14px 6px;background:#FBF8F6;border:1px solid #EAE4DF;border-radius:12px">
    <p style="margin:0;font-size:24px;font-weight:800;color:#1D1D27">${n.toLocaleString("vi-VN")}</p><p style="margin:4px 0 0;font-size:12px;color:#6B6B7B">${label}</p></td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="6" style="margin:8px 0"><tr>
    ${item(s.followers, "Người theo dõi mới")}${item(s.likes, "Lượt thích mới")}${item(s.comments, "Bình luận mới")}
  </tr><tr>${item(s.videos, "Tổng số video")}${item(s.views, "Tổng lượt xem")}<td></td></tr></table>`;
}

export function buildEmail(def: AutomationConfig, p: Person, ctx: Ctx) {
  const subject = fill(def.subject, p, ctx, def.delayDays);
  const body = fill(def.body, p, ctx, def.delayDays);
  const extra = ctx.videos ? videoBlock(ctx.videos) : ctx.stats ? statsBlock(ctx.stats) : "";
  const unsubscribe = unsubscribeUrl(p.id);
  const button = def.buttonLabel ? { label: def.buttonLabel, url: `${SITE_URL}${def.url}` } : undefined;
  return {
    to: p.email,
    subject,
    unsubscribeUrl: unsubscribe,
    text: `${body}${button ? `\n\n${button.label}: ${button.url}` : ""}\n\n--\nHủy nhận email: ${unsubscribe}`,
    html: emailShell({
      locale: "vi", to: p.email, preheader: body.replace(/\s+/g, " ").slice(0, 110), eyebrow: "VaraClip", title: subject,
      bodyHtml: textToHtml(body) + extra, button,
      reason: "Bạn nhận email này vì đã đồng ý nhận thông tin từ VaraClip khi đăng ký.", unsubscribe,
    }),
  };
}

const personSelect = { id: true, email: true, displayName: true, salonName: true, isSalon: true, bookingUrl: true, phone: true, createdAt: true } as const;

/** People who agreed to marketing email. */
async function audience(): Promise<Person[]> {
  const ids = (await db.userConsent.findMany({ where: { marketingEmail: true }, select: { userId: true } })).map((c) => c.userId);
  if (!ids.length) return [];
  return db.user.findMany({ where: { id: { in: ids } }, select: personSelect });
}

export type RunResult = { sent: number; failed: number; byKey: Record<string, number>; capped: boolean };

/** Sends what is due now. With `onlyCount`, sends nothing and returns how many people each automation would reach. */
export async function runAutomations(opts: { onlyCount?: boolean } = {}): Promise<RunResult> {
  const result: RunResult = { sent: 0, failed: 0, byKey: {}, capped: false };
  const configs = (await loadConfigs()).filter((c) => opts.onlyCount || c.enabled);
  if (!configs.length) return result;
  const people = await audience();
  const now = new Date();
  let hot: VideoCard[] | null = null;
  const getHot = async () => (hot ??= await hotCards());

  for (const def of configs) {
    const period = periodKey(def.period, now);
    // Done = sent, being sent, or failed less than a day ago (a failed email is retried once a day).
    const retryBefore = new Date(now.getTime() - DAY);
    const already = new Set(
      (await db.emailAutomationSend.findMany({
        where: { automation: def.key, period, OR: [{ status: { not: "failed" } }, { sentAt: { gt: retryBefore } }] },
        select: { userId: true },
      })).map((r) => r.userId),
    );
    result.byKey[def.key] = 0;
    for (const p of people) {
      if (already.has(p.id)) continue;
      const ctx = await eligible(def, p, now, getHot).catch(() => null);
      if (!ctx) continue;
      if (opts.onlyCount) { result.byKey[def.key]++; continue; }
      if (result.sent + result.failed >= MAX_PER_RUN) { result.capped = true; return result; }
      // Claim first: the unique (automation, user, period) row stops a second server process sending it again.
      try {
        await db.emailAutomationSend.create({ data: { automation: def.key, userId: p.id, period, status: "sending" } });
      } catch {
        // Already there: only an old failed attempt may be taken over for a retry.
        const retry = await db.emailAutomationSend.updateMany({
          where: { automation: def.key, userId: p.id, period, status: "failed", sentAt: { lte: retryBefore } },
          data: { status: "sending", sentAt: now, error: "" },
        });
        if (retry.count !== 1) continue;
      }
      const r = await sendMail(buildEmail(def, p, ctx));
      await db.emailAutomationSend.update({
        where: { automation_userId_period: { automation: def.key, userId: p.id, period } },
        data: r.ok ? { status: "sent" } : { status: "failed", error: r.error.slice(0, 190) },
      });
      if (r.ok) { result.sent++; result.byKey[def.key]++; } else result.failed++;
      await new Promise((ok) => setTimeout(ok, GAP_MS));
    }
  }
  return result;
}

/** Test email to the admin, filled with the admin's own data (or sample numbers). */
export async function sendTest(key: string, adminId: string) {
  const def = (await loadConfigs()).find((c) => c.key === key);
  const me = await db.user.findUnique({ where: { id: adminId }, select: personSelect });
  if (!def || !me) return { ok: false as const, error: "Not found" };
  const ctx: Ctx = {
    count: 5, days: def.delayDays,
    ...(def.block === "stats" ? { stats: { followers: 12, likes: 48, comments: 9, videos: 20, views: 3400 } } : {}),
    ...(["hot", "following", "new"].includes(def.block) ? { videos: await hotCards() } : {}),
  };
  const mail = buildEmail(def, { ...me, salonName: me.salonName || "Salon của bạn" }, ctx);
  return sendMail({ ...mail, subject: `[Thử] ${mail.subject}` });
}

/** Called on normal page traffic: runs the automations at most once an hour across all server processes. */
export async function maybeRunAutomations() {
  if (!mailConfigured()) return;
  try {
    const cutoff = new Date(Date.now() - RUN_EVERY_MS).toISOString();
    const nowIso = new Date().toISOString();
    const existing = await db.siteSetting.findUnique({ where: { key: LOCK_KEY } });
    if (!existing) {
      await db.siteSetting.create({ data: { key: LOCK_KEY, value: nowIso } });
    } else {
      // Only the process that moves the timestamp forward runs (an atomic conditional update).
      const won = await db.siteSetting.updateMany({ where: { key: LOCK_KEY, value: { lt: cutoff } }, data: { value: nowIso } });
      if (won.count !== 1) return;
    }
    const r = await runAutomations();
    if (r.sent || r.failed) console.log("[automations]", JSON.stringify(r));
  } catch (e) {
    // Tables not created yet, or a database hiccup: try again next hour.
    if (process.env.NODE_ENV !== "production") console.error("[automations]", e);
  }
}

export async function lastRun(): Promise<string | null> {
  return (await db.siteSetting.findUnique({ where: { key: LOCK_KEY } }).catch(() => null))?.value ?? null;
}
