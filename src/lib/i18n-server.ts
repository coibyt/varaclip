import { cookies, headers } from "next/headers";
import {
  COUNTRY_HEADERS, DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, localeFromAcceptLanguage, localeFromCountry, makeT,
  type Locale, type Messages,
} from "./i18n";

const loaders: Record<Locale, () => Promise<{ default: Messages }>> = {
  vi: () => import("@/locales/vi"),
  en: () => import("@/locales/en"),
  fi: () => import("@/locales/fi"),
  sv: () => import("@/locales/sv"),
  es: () => import("@/locales/es"),
  fr: () => import("@/locales/fr"),
  de: () => import("@/locales/de"),
  pt: () => import("@/locales/pt"),
  it: () => import("@/locales/it"),
  ru: () => import("@/locales/ru"),
  zh: () => import("@/locales/zh"),
  ja: () => import("@/locales/ja"),
  ko: () => import("@/locales/ko"),
  th: () => import("@/locales/th"),
  id: () => import("@/locales/id"),
};

/**
 * Order: the visitor's own choice (cookie) → the country they are connecting
 * from (CDN geo header) → their browser language → English.
 */
export async function getLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  const h = await headers();
  for (const name of COUNTRY_HEADERS) {
    const l = localeFromCountry(h.get(name));
    if (l) return l;
  }
  return localeFromAcceptLanguage(h.get("accept-language")) ?? DEFAULT_LOCALE;
}

export async function getMessages(locale: Locale): Promise<Messages> {
  return (await loaders[locale]()).default;
}

export async function getT() {
  const locale = await getLocale();
  const [messages, fallback] = await Promise.all([getMessages(locale), getMessages("en")]);
  return { t: makeT(messages, fallback), locale };
}
