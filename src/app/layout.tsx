import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLocale, getMessages, getT } from "@/lib/i18n-server";
import { isRtl } from "@/lib/i18n";
import { Shell } from "@/components/shell";
import { isAdminUser } from "@/lib/admin";
import { LocaleProvider } from "@/components/locale-provider";
import { InstallBanner, PwaRegister } from "@/components/install-app";

const sans = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext", "vietnamese"], variable: "--font-sans", display: "swap" });

const display = Playfair_Display({ subsets: ["latin", "latin-ext", "vietnamese", "cyrillic"], variable: "--font-display", display: "swap" });

const name = process.env.NEXT_PUBLIC_SITE_NAME || "VaraClip";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: { default: `${name} — ${t("meta.title")}`, template: `%s · ${name}` },
    description: t("meta.description"),
    applicationName: name,
    icons: { icon: "/pwa-icon?size=192&round=1", apple: "/pwa-icon?size=180" },
    appleWebApp: { capable: true, title: name, statusBarStyle: "black-translucent" },
  };
}

export const viewport: Viewport = { themeColor: "#0B0B0F", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [me, locale] = await Promise.all([getUser(), getLocale()]);
  const [messages, fallback] = await Promise.all([getMessages(locale), getMessages("en")]);
  const unread = me ? await db.directMessage.count({ where: { recipientId: me.id, readAt: null } }).catch(() => 0) : 0;
  const user = me ? { handle: me.handle, displayName: me.displayName, isSalon: me.isSalon, hue: me.hue, isAdmin: isAdminUser(me) } : null;
  return (
    <html lang={locale} dir={isRtl(locale) ? "rtl" : "ltr"} className={`${sans.variable} ${display.variable}`}>
      <body className="font-sans">
        <LocaleProvider locale={locale} messages={messages} fallback={fallback}>
          <Shell user={user} unread={unread}>{children}</Shell>
          <InstallBanner />
          <PwaRegister />
        </LocaleProvider>
      </body>
    </html>
  );
}
