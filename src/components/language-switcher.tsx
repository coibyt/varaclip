"use client";

import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { useI18n } from "./locale-provider";

/** Lets visitors override the automatic language; the choice is remembered for a year. */
export function LanguageSwitcher({ className = "", iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  const router = useRouter();
  const { locale, t } = useI18n();

  function change(code: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  if (iconOnly) {
    // Round globe button; the native <select> sits invisibly on top so phones open their own picker.
    return (
      <label className={`relative grid size-10 cursor-pointer place-items-center rounded-full bg-black/40 backdrop-blur transition hover:bg-black/60 ${className}`}>
        <Globe className="size-5" aria-hidden />
        <span className="sr-only">{t("lang.label")}</span>
        <select value={locale} onChange={(e) => change(e.target.value as Locale)} className="absolute inset-0 size-full cursor-pointer opacity-0">
          {LOCALES.map((l) => (
            <option key={l.code} value={l.code}>{l.name}</option>
          ))}
        </select>
      </label>
    );
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
