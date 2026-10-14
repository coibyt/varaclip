"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, Home, LayoutDashboard, LogOut, MessageCircle, Plus, Radio, Settings, Sparkles, User } from "lucide-react";
import { Avatar } from "./avatar";
import { InstallButton } from "./install-app";
import { LanguageSwitcher } from "./language-switcher";
import { useT } from "./locale-provider";

export type ShellUser = { handle: string; displayName: string; isSalon: boolean; hue: number } | null;

const SITE = process.env.NEXT_PUBLIC_SITE_NAME || "VaraClip";

export function Shell({ user, unread: initialUnread = 0, children }: { user: ShellUser; unread?: number; children: React.ReactNode }) {
  const t = useT();
  const path = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(initialUnread);
  const uploadHref = user ? (user.isSalon ? "/upload" : "/register?salon=1") : "/login?next=/upload";

  useEffect(() => setUnread(initialUnread), [initialUnread]);

  // Keep the unread badge fresh while the tab is open.
  useEffect(() => {
    if (!user) return;
    const poll = async () => {
      if (document.hidden) return;
      const r = await fetch("/api/messages/unread", { cache: "no-store" }).catch(() => null);
      if (r?.ok) setUnread((await r.json()).count ?? 0);
    };
    const iv = setInterval(poll, 20_000);
    return () => clearInterval(iv);
  }, [user, path]);

  const nav = {
    home: { href: "/", label: t("nav.foryou"), short: t("nav.home"), icon: Home, match: (p: string) => p === "/" },
    discover: { href: "/discover", label: t("nav.discover"), short: t("nav.discover"), icon: Compass, match: (p: string) => p.startsWith("/discover") },
    live: { href: "/live", label: t("nav.live"), short: t("nav.live"), icon: Radio, match: (p: string) => p.startsWith("/live") },
    messages: {
      href: user ? "/messages" : "/login?next=/messages", label: t("nav.messages"), short: t("nav.messages"), icon: MessageCircle,
      match: (p: string) => p.startsWith("/messages"), badge: user ? unread : 0,
    },
    studio: { href: "/studio", label: t("nav.studio"), short: t("nav.studio"), icon: LayoutDashboard, match: (p: string) => p.startsWith("/studio") },
    profile: {
      href: user ? `/u/${user.handle}` : "/login", label: user ? t("nav.profile") : t("nav.login"), short: user ? t("nav.profile") : t("nav.login"), icon: User,
      match: (p: string) => (user ? p === `/u/${user.handle}` : p.startsWith("/login")),
    },
  };
  type NavItem = (typeof nav)[keyof typeof nav] & { badge?: number };

  const sidebar: NavItem[] = [nav.home, nav.discover, nav.live, nav.messages, ...(user?.isSalon ? [nav.studio] : []), nav.profile];
  const mobileLeft: NavItem[] = [nav.home, nav.live];
  const mobileRight: NavItem[] = [nav.messages, nav.profile];

  const isEmbed = path.startsWith("/embed");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (isEmbed) return <>{children}</>;

  const Badge = ({ n }: { n?: number }) =>
    n ? <span className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-glow px-1 text-[10px] font-extrabold leading-[18px] text-white tabular-nums">{n > 99 ? "99+" : n}</span> : null;

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col border-r border-white/5 bg-ink px-4 py-6 lg:flex">
        <Link href="/" className="mb-8 flex items-center gap-2 px-2 font-display text-2xl font-bold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-glow to-gold text-ink"><Sparkles className="size-5" aria-hidden /></span>
          {SITE}
        </Link>
        <nav className="flex flex-col gap-1" aria-label={t("nav.main")}>
          {sidebar.map(({ href, label, icon: Icon, match, badge }) => (
            <Link
              key={href}
              href={href}
              aria-current={match(path) ? "page" : undefined}
              className={`flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition hover:bg-white/5 ${match(path) ? "text-glow" : "text-white"}`}
            >
              <span className="relative"><Icon className={`size-6 ${href === "/live" ? "text-red-500" : ""}`} aria-hidden /><Badge n={badge} /></span> {label}
            </Link>
          ))}
          <Link href={uploadHref} className="btn btn-primary mt-3">
            <Plus className="size-5" aria-hidden /> {t("nav.upload")}
          </Link>
        </nav>

        <div className="mt-auto space-y-3">
          <InstallButton quiet className="rounded-2xl shadow-lg shadow-glow/30" />
          <LanguageSwitcher />
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
                <Link href="/settings" className="btn btn-ghost !min-h-[40px] flex-1 !px-3 text-sm"><Settings className="size-4" aria-hidden /> {t("nav.settings")}</Link>
                <button onClick={logout} aria-label={t("nav.logout")} className="btn btn-ghost !min-h-[40px] !px-3"><LogOut className="size-4" aria-hidden /></button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-ink-2 p-4">
              <p className="text-sm text-mist">{t("nav.guestHint")}</p>
              <Link href="/login" className="btn btn-primary mt-3 w-full">{t("nav.login")}</Link>
              <Link href="/register" className="btn btn-ghost mt-2 w-full">{t("auth.submitCreate")}</Link>
            </div>
          )}
        </div>
      </aside>

      <main className="lg:pl-[240px]">{children}</main>

      {/* Mobile tab bar: Home · Live · + · Messages · Profile (Discover sits on the feed, Studio on the profile) */}
      <nav
        aria-label={t("nav.main")}
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex h-[calc(var(--nav-h)+env(safe-area-inset-bottom))] items-center justify-around border-t border-white/10 bg-ink/95 backdrop-blur lg:hidden"
      >
        {[...mobileLeft.map((n) => ({ n, side: "l" })), { n: null, side: "plus" }, ...mobileRight.map((n) => ({ n, side: "r" }))].map((e) =>
          e.n ? (
            <Link
              key={e.n.href} href={e.n.href} aria-current={e.n.match(path) ? "page" : undefined}
              className={`flex min-h-[48px] w-[64px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${e.n.match(path) ? "text-glow" : "text-mist"}`}
            >
              <span className="relative"><e.n.icon className={`size-6 ${e.n.href === "/live" && !e.n.match(path) ? "text-red-500" : ""}`} aria-hidden /><Badge n={e.n.badge} /></span>
              <span className="max-w-full truncate px-1">{e.n.short}</span>
            </Link>
          ) : (
            <Link key="plus" href={uploadHref} aria-label={t("nav.upload")} className="grid h-10 w-14 place-items-center rounded-xl bg-gradient-to-r from-glow to-gold text-ink">
              <Plus className="size-6" aria-hidden />
            </Link>
          ),
        )}
      </nav>
    </div>
  );
}
