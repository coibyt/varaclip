import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { helsinkiDay, onlineNow } from "@/lib/online";
import { AutoRefresh } from "@/components/auto-refresh";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

const DAY = 24 * 3600_000;
const PAGE = 25;
const PLATFORM_LABEL: Record<string, string> = { android: "Android", ios: "iPhone / iPad", desktop: "Máy tính", other: "Khác" };
const SQL_NOTICE = (file: string) => (
  <div className="mt-3 rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm leading-relaxed">
    Chưa có bảng thống kê. Vào phpMyAdmin, mở tab SQL, dán nội dung file <code>{file}</code> rồi bấm Thực hiện. Sau đó tải lại trang này.
  </div>
);

const fmt = (d: Date) => d.toLocaleString("vi-VN", { timeZone: "Europe/Helsinki", dateStyle: "short", timeStyle: "short" });

function Card({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-ink-2 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-mist">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-mist">{sub}</p>}
    </div>
  );
}

function Bars({ days, values, color = "bg-glow/80" }: { days: string[]; values: number[]; color?: string }) {
  const max = Math.max(1, ...values);
  return (
    <>
      <div className="mt-4 flex h-32 items-end gap-[3px]" role="img" aria-label="Biểu đồ theo ngày">
        {days.map((k, i) => (
          <div key={k} title={`${k}: ${values[i]}`} className={`flex-1 rounded-t ${color}`} style={{ height: `${Math.max(values[i] ? 6 : 2, (values[i] / max) * 100)}%`, opacity: values[i] ? 1 : 0.25 }} />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-mist"><span>{days[0]}</span><span>{days[days.length - 1]}</span></div>
    </>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const me = await getUser();
  if (!isAdminUser(me)) notFound();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);

  // ── site totals
  const [users, salons, videos, follows, likes, comments, lives] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { isSalon: true } }),
    db.video.count(),
    db.follow.count(),
    db.like.count(),
    db.comment.count(),
    db.liveStream.count({ where: { status: "LIVE" } }).catch(() => 0),
  ]);

  // ── traffic (last 14 days, Helsinki days)
  const now = Date.now();
  const days = Array.from({ length: 14 }, (_, i) => helsinkiDay(new Date(now - (13 - i) * DAY)));
  const today = days[days.length - 1];
  const traffic = await db.siteVisit
    .groupBy({ by: ["day"], where: { day: { in: days } }, _count: { _all: true }, _sum: { views: true } })
    .catch(() => null);
  const visitorsBy = new Map((traffic ?? []).map((r) => [r.day, r._count._all]));
  const viewsBy = new Map((traffic ?? []).map((r) => [r.day, r._sum.views ?? 0]));
  const visitorsToday = visitorsBy.get(today) ?? 0;
  const loggedToday = traffic ? await db.siteVisit.count({ where: { day: today, userId: { not: null } } }).catch(() => 0) : 0;
  const online = onlineNow();

  // ── customers
  const where = q ? { OR: [{ email: { contains: q } }, { handle: { contains: q } }, { displayName: { contains: q } }, { salonName: { contains: q } }] } : {};
  const [matching, people] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE,
      select: { id: true, email: true, handle: true, displayName: true, salonName: true, isSalon: true, phone: true, createdAt: true, _count: { select: { videos: true } } },
    }),
  ]);
  const ids = people.map((p) => p.id);
  const [followerRows, likeRows] = await Promise.all([
    db.follow.groupBy({ by: ["followingId"], where: { followingId: { in: ids } }, _count: { _all: true } }),
    db.video.findMany({ where: { creatorId: { in: ids } }, select: { creatorId: true, _count: { select: { likes: true } } } }),
  ]);
  const followersOf = new Map(followerRows.map((r) => [r.followingId, r._count._all]));
  const likesOf = new Map<string, number>();
  for (const v of likeRows) likesOf.set(v.creatorId, (likesOf.get(v.creatorId) ?? 0) + v._count.likes);
  const pages = Math.max(1, Math.ceil(matching / PAGE));
  const link = (p: number) => `/admin?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}#khach-hang`;

  // ── app installs
  const rows = await db.appInstall.findMany({ orderBy: { createdAt: "desc" }, take: 20000 }).catch(() => null);
  const devices = new Map<string, { first: Date; platform: string; installed: boolean; opened: boolean }>();
  for (const r of [...(rows ?? [])].reverse()) {
    const d = devices.get(r.deviceKey) ?? { first: r.createdAt, platform: r.platform, installed: false, opened: false };
    if (r.kind === "installed") d.installed = true;
    else d.opened = true;
    devices.set(r.deviceKey, d);
  }
  const list = [...devices.values()];
  const since = (ms: number) => list.filter((d) => now - d.first.getTime() < ms).length;
  const byPlatform = ["android", "ios", "desktop", "other"].map((p) => ({ p, n: list.filter((d) => d.platform === p).length })).filter((x) => x.n > 0);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-8 lg:pb-12">
      <AutoRefresh seconds={30} />
      <h1 className="text-2xl font-extrabold tracking-tight">Quản trị</h1>

      <h2 className="mt-8 text-lg font-bold">Tổng quan website</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Thành viên" value={users} sub={`${salons} salon`} />
        <Card label="Video" value={videos} />
        <Card label="Tổng lượt theo dõi" value={follows} />
        <Card label="Tổng lượt thích" value={likes} sub={`${comments} bình luận`} />
      </div>

      <h2 className="mt-10 text-lg font-bold">Lượng truy cập</h2>
      {traffic === null ? SQL_NOTICE("docs/database-visits.sql") : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card label="Đang xem website" value={online} sub="trong 1 phút qua" />
            <Card label="Khách hôm nay" value={visitorsToday} sub={`${loggedToday} đã đăng nhập`} />
            <Card label="Lượt xem trang hôm nay" value={viewsBy.get(today) ?? 0} />
            <Card label="Khách hôm qua" value={visitorsBy.get(days[days.length - 2]) ?? 0} sub={`${viewsBy.get(days[days.length - 2]) ?? 0} lượt xem trang`} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Card label="Trung bình 7 ngày" value={Math.round(days.slice(-7).reduce((s, k) => s + (visitorsBy.get(k) ?? 0), 0) / 7)} sub="khách mỗi ngày" />
            <Card label="Đang livestream" value={lives} />
          </div>
          <div className="mt-4 rounded-2xl bg-ink-2 p-4">
            <p className="text-sm font-semibold">Khách truy cập mỗi ngày (14 ngày, giờ Helsinki)</p>
            <Bars days={days} values={days.map((k) => visitorsBy.get(k) ?? 0)} color="bg-sky-400/80" />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-mist">
            Mỗi trình duyệt tính là một khách trong ngày, dù xem nhiều trang. “Đang xem” đếm các tab đang mở website, bắt đầu từ 0 mỗi khi máy chủ khởi động lại. Số liệu chỉ tính từ lúc bật tính năng này.
          </p>
        </>
      )}

      <h2 id="khach-hang" className="mt-10 scroll-mt-4 text-lg font-bold">Khách hàng đã đăng ký</h2>
      <form action="/admin" role="search" className="mt-3 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Tìm theo email, tên, @tên người dùng" className="input" />
        <button className="btn btn-primary shrink-0">Tìm</button>
      </form>
      <p className="mt-2 text-xs text-mist">{matching} tài khoản{q ? ` khớp “${q}”` : ""}</p>
      <div className="mt-2 overflow-x-auto rounded-2xl bg-ink-2">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase text-mist">
            <tr><th className="p-3">Email</th><th className="p-3">Tên</th><th className="p-3 text-right">Video</th><th className="p-3 text-right">Theo dõi</th><th className="p-3 text-right">Thích</th><th className="p-3">Đăng ký</th></tr>
          </thead>
          <tbody>
            {people.length === 0 && <tr><td colSpan={6} className="p-4 text-mist">Không có tài khoản nào.</td></tr>}
            {people.map((p) => (
              <tr key={p.id} className="border-t border-white/5">
                <td className="max-w-[240px] break-all p-3">{p.email}{p.phone && <span className="block text-xs text-mist">{p.phone}</span>}</td>
                <td className="p-3">
                  <Link href={`/u/${p.handle}`} className="font-semibold hover:underline">{p.salonName || p.displayName}</Link>
                  <span className="block text-xs text-mist">@{p.handle}{p.isSalon ? " · salon" : ""}</span>
                </td>
                <td className="p-3 text-right tabular-nums">{p._count.videos}</td>
                <td className="p-3 text-right tabular-nums">{followersOf.get(p.id) ?? 0}</td>
                <td className="p-3 text-right tabular-nums">{likesOf.get(p.id) ?? 0}</td>
                <td className="whitespace-nowrap p-3 text-xs text-mist">{fmt(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        {page > 1 ? <Link href={link(page - 1)} className="btn btn-ghost !min-h-[40px]">← Trước</Link> : <span />}
        <span className="text-mist">Trang {page} / {pages}</span>
        {page < pages ? <Link href={link(page + 1)} className="btn btn-ghost !min-h-[40px]">Sau →</Link> : <span />}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-mist">“Theo dõi” là số người đang theo dõi tài khoản đó. “Thích” là tổng lượt thích trên các video của tài khoản đó.</p>

      <h2 className="mt-10 text-lg font-bold">Lượt tải ứng dụng</h2>
      {rows === null ? SQL_NOTICE("docs/database-app-installs.sql") : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card label="Tổng thiết bị" value={list.length} sub="đã cài hoặc đã mở app" />
            <Card label="24 giờ qua" value={since(DAY)} />
            <Card label="7 ngày qua" value={since(7 * DAY)} />
            <Card label="30 ngày qua" value={since(30 * DAY)} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card label="Bấm cài thành công" value={list.filter((d) => d.installed).length} sub="Android, máy tính" />
            <Card label="Đã mở bằng app" value={list.filter((d) => d.opened).length} sub="gồm cả iPhone" />
            {byPlatform.map((x) => <Card key={x.p} label={PLATFORM_LABEL[x.p]} value={x.n} />)}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-mist">
            Đếm theo thiết bị (mỗi thiết bị một lần). iPhone không báo lúc cài nên chỉ đếm khi khách mở bằng icon trên màn hình chính. Khách gỡ app không bị trừ đi.
          </p>
        </>
      )}
    </div>
  );
}
