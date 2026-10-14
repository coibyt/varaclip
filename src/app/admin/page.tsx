import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

const DAY = 24 * 3600_000;
const PLATFORM_LABEL: Record<string, string> = { android: "Android", ios: "iPhone / iPad", desktop: "Máy tính", other: "Khác" };

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function AdminPage() {
  const me = await getUser();
  if (!isAdminUser(me)) notFound();

  const [users, salons, videos, lives, rows] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { isSalon: true } }),
    db.video.count(),
    db.liveStream.count({ where: { status: "LIVE" } }).catch(() => 0),
    db.appInstall.findMany({ orderBy: { createdAt: "desc" }, take: 20000 }).catch(() => null),
  ]);

  // One entry per device: when it first showed up, on what, and whether it reported an install and/or an app launch.
  const devices = new Map<string, { first: Date; platform: string; installed: boolean; opened: boolean; userId: string | null }>();
  for (const r of [...(rows ?? [])].reverse()) {
    const d = devices.get(r.deviceKey) ?? { first: r.createdAt, platform: r.platform, installed: false, opened: false, userId: null };
    if (r.kind === "installed") d.installed = true;
    else d.opened = true;
    d.userId ??= r.userId;
    devices.set(r.deviceKey, d);
  }
  const list = [...devices.values()];
  const now = Date.now();
  const since = (ms: number) => list.filter((d) => now - d.first.getTime() < ms).length;

  const byPlatform = ["android", "ios", "desktop", "other"].map((p) => ({ p, n: list.filter((d) => d.platform === p).length })).filter((x) => x.n > 0);

  const days = Array.from({ length: 30 }, (_, i) => dayKey(new Date(now - (29 - i) * DAY)));
  const perDay = new Map(days.map((k) => [k, 0]));
  for (const d of list) {
    const k = dayKey(d.first);
    if (perDay.has(k)) perDay.set(k, (perDay.get(k) ?? 0) + 1);
  }
  const max = Math.max(1, ...perDay.values());

  const recent = (rows ?? []).slice(0, 15);
  const handles = new Map(
    (await db.user.findMany({ where: { id: { in: recent.map((r) => r.userId).filter((x): x is string => !!x) } }, select: { id: true, handle: true } })).map((u) => [u.id, u.handle]),
  );

  const card = (label: string, value: number | string, sub?: string) => (
    <div className="rounded-2xl bg-ink-2 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-mist">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-mist">{sub}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 pb-28 pt-8 lg:pb-12">
      <h1 className="text-2xl font-extrabold tracking-tight">Quản trị</h1>

      <h2 className="mt-8 text-lg font-bold">Lượt tải ứng dụng</h2>
      {rows === null ? (
        <div className="mt-3 rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm leading-relaxed">
          Chưa có bảng thống kê. Vào phpMyAdmin, mở tab SQL, dán nội dung file <code>docs/database-app-installs.sql</code> rồi bấm Thực hiện. Sau đó tải lại trang này.
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {card("Tổng thiết bị", list.length, "đã cài hoặc đã mở app")}
            {card("24 giờ qua", since(DAY))}
            {card("7 ngày qua", since(7 * DAY))}
            {card("30 ngày qua", since(30 * DAY))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {card("Bấm cài thành công", list.filter((d) => d.installed).length, "Android, máy tính")}
            {card("Đã mở bằng app", list.filter((d) => d.opened).length, "gồm cả iPhone")}
            {byPlatform.map((x) => card(PLATFORM_LABEL[x.p], x.n))}
          </div>

          <div className="mt-6 rounded-2xl bg-ink-2 p-4">
            <p className="text-sm font-semibold">Thiết bị mới theo ngày (30 ngày)</p>
            <div className="mt-4 flex h-32 items-end gap-[3px]" role="img" aria-label="Biểu đồ thiết bị mới theo ngày">
              {days.map((k) => {
                const n = perDay.get(k) ?? 0;
                return <div key={k} title={`${k}: ${n}`} className="flex-1 rounded-t bg-glow/80" style={{ height: `${Math.max(n ? 6 : 2, (n / max) * 100)}%`, opacity: n ? 1 : 0.25 }} />;
              })}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-mist"><span>{days[0]}</span><span>{days[days.length - 1]}</span></div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl bg-ink-2">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-mist"><tr><th className="p-3">Thời gian</th><th className="p-3">Sự kiện</th><th className="p-3">Thiết bị</th><th className="p-3">Tài khoản</th></tr></thead>
              <tbody>
                {recent.length === 0 && <tr><td colSpan={4} className="p-4 text-mist">Chưa có lượt tải nào.</td></tr>}
                {recent.map((r) => (
                  <tr key={r.id} className="border-t border-white/5">
                    <td className="whitespace-nowrap p-3 tabular-nums">{r.createdAt.toLocaleString("vi-VN", { timeZone: "Europe/Helsinki" })}</td>
                    <td className="p-3">{r.kind === "installed" ? "Đã cài" : "Mở bằng app"}</td>
                    <td className="p-3">{PLATFORM_LABEL[r.platform] ?? r.platform}</td>
                    <td className="p-3 text-mist">{r.userId ? `@${handles.get(r.userId) ?? "?"}` : "Khách"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-mist">
            Số liệu đếm theo thiết bị (mỗi thiết bị chỉ tính một lần). iPhone không báo lúc cài nên chỉ đếm khi khách mở bằng icon trên màn hình chính. Khách gỡ app không bị trừ đi.
          </p>
        </>
      )}

      <h2 className="mt-10 text-lg font-bold">Tổng quan website</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {card("Thành viên", users)}
        {card("Salon", salons)}
        {card("Video", videos)}
        {card("Đang livestream", lives)}
      </div>
    </div>
  );
}
