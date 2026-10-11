import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { getUser } from "@/lib/auth";
import { Shell } from "@/components/shell";

const sans = Plus_Jakarta_Sans({ subsets: ["latin", "vietnamese"], variable: "--font-sans", display: "swap" });

const display = Playfair_Display({ subsets: ["latin", "vietnamese"], variable: "--font-display", display: "swap" });

const name = process.env.NEXT_PUBLIC_SITE_NAME || "GlowReels";

export const metadata: Metadata = {
  title: { default: `${name} — Video làm đẹp từ các salon`, template: `%s · ${name}` },
  description: "Xem và chia sẻ video làm đẹp ngắn từ các salon tóc, nail, spa. Thích, theo dõi và đặt lịch ngay.",
};

export const viewport: Viewport = { themeColor: "#0B0B0F", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const me = await getUser();
  const user = me ? { handle: me.handle, displayName: me.displayName, isSalon: me.isSalon, hue: me.hue } : null;
  return (
    <html lang="vi" className={`${sans.variable} ${display.variable}`}>
      <body className="font-sans">
        <Shell user={user}>{children}</Shell>
      </body>
    </html>
  );
}
