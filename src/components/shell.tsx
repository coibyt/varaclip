"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, Home, LogOut, Plus, Settings, Sparkles, User, LayoutDashboard } from "lucide-react";
import { Avatar } from "./avatar";

export type ShellUser = { handle: string; displayName: string; isSalon: boolean; hue: number } | null;

const SITE = process.env.NEXT_PUBLIC_SITE_NAME || "VaraClip";

export function Shell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const uploadHref = user ? (user.isSalon ? "/upload" : "/register?salon=1") : "/login?next=/upload";

  const items = [
    { href: "/", label: "Dành cho bạn", icon: Home, match: (p: string) => p === "/" },
    { href: "/discover", label: "Khám phá", icon: Compass, match: (p: string) => p.startsWith("/discover") },
    ...(user?.isSalon ? [{ href: "/studio", label: "Studio", icon: LayoutDashboard, match: (p: string) => p.startsWith("/studio") }] : []),
    {
      href: user ? `/u/${user.handle}` : "/login",
      label: user ? "Hồ sơ" : "Đăng nhập",
      icon: User,
      match: (p: string) => (user ? p === `/u/${user.handle}` : p.startsWith("/login")),
    },
  ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col border-r border-white/5 bg-ink px-4 py-6 lg:flex">
        <Link href="/" className="mb-8 flex items-center gap-2 px-2 font-display text-2xl font-bold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-glow to-gold text-ink"><Sparkles className="size-5" aria-hidden /></span>
          {SITE}
        </Link>
        <nav className="flex flex-col gap-1" aria-label="Chính">
          {items.map(({ href, label, icon: Icon, match }) => (
            <Link
              key={label}
              href={href}
              aria-current={match(path) ? "page" : undefined}
              className={`flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition hover:bg-white/5 ${match(path) ? "text-glow" : "text-white"}`}
            >
              <Icon className="size-6" aria-hidden /> {label}
            </Link>
          ))}
          <Link href={uploadHref} className="btn btn-primary mt-3">
            <Plus className="size-5" aria-hidden /> Đăng video
          </Link>
        </nav>

        <div className="mt-auto">
          {user ? (
            <div className="rounded-2xl bg-ink-2 p-3">
              <Link href={`/u/${user.handle}`} className="flex items-center gap-3">
                <Avatar name={user.displayName} hue={user.hue} size={40} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{user.displayName}</span>
                  <span className="block truncate text-xs text-mist">@{user.handle}</span>
                </span>
              </Link>
              <div className="mt-3 flex gap-2">
                <Link href="/settings" className="btn btn-ghost !min-h-[40px] flex-1 !px-3 text-sm"><Settings className="size-4" aria-hidden /> Cài đặt</Link>
                <button onClick={logout} aria-label="Đăng xuất" className="btn btn-ghost !min-h-[40px] !px-3"><LogOut className="size-4" aria-hidden /></button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-ink-2 p-4">
              <p className="text-sm text-mist">Đăng nhập để thích, bình luận và theo dõi salon.</p>
              <Link href="/login" className="btn btn-primary mt-3 w-full">Đăng nhập</Link>
              <Link href="/register" className="btn btn-ghost mt-2 w-full">Tạo tài khoản</Link>
            </div>
          )}
        </div>
      </aside>

      <main className="lg:pl-[240px]">{children}</main>

      {/* Mobile tab bar */}
      <nav
        aria-label="Chính"
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex h-[calc(var(--nav-h)+env(safe-area-inset-bottom))] items-center justify-around border-t border-white/10 bg-ink/95 backdrop-blur lg:hidden"
      >
        {[items[0], items[1]].map(({ href, label, icon: Icon, match }) => (
          <Link key={label} href={href} aria-current={match(path) ? "page" : undefined} className={`flex min-h-[48px] min-w-[64px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${match(path) ? "text-glow" : "text-mist"}`}>
            <Icon className="size-6" aria-hidden /> {label === "Dành cho bạn" ? "Trang chủ" : label}
          </Link>
        ))}
        <Link href={uploadHref} aria-label="Đăng video" className="grid h-10 w-14 place-items-center rounded-xl bg-gradient-to-r from-glow to-gold text-ink">
          <Plus className="size-6" aria-hidden />
        </Link>
        {items.slice(2).map(({ href, label, icon: Icon, match }) => (
          <Link key={label} href={href} aria-current={match(path) ? "page" : undefined} className={`flex min-h-[48px] min-w-[64px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${match(path) ? "text-glow" : "text-mist"}`}>
            <Icon className="size-6" aria-hidden /> {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
