"use client";

import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { useI18n } from "./locale-provider";

/** Lets visitors override the automatic language; the choice is remembered for a year. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { locale, t } = useI18n();

  function change(code: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <label className={`relative flex min-h-[44px] items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 text-sm font-semibold ${className}`}>
      <Globe className="size-4 shrink-0 text-mist" aria-hidden />
      <span className="sr-only">{t("lang.label")}</span>
      <select
        value={locale}
        onChange={(e) => change(e.target.value as Locale)}
        className="w-full cursor-pointer appearance-none bg-transparent pr-2 outline-none"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code} className="bg-ink-2 text-white">{l.name}</option>
        ))}
      </select>
    </label>
  );
}
