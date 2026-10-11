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
  no: () => import("@/locales/no"),
  da: () => import("@/locales/da"),
  nl: () => import("@/locales/nl"),
  de: () => import("@/locales/de"),
  fr: () => import("@/locales/fr"),
  es: () => import("@/locales/es"),
  pt: () => import("@/locales/pt"),
  it: () => import("@/locales/it"),
  pl: () => import("@/locales/pl"),
  cs: () => import("@/locales/cs"),
  sk: () => import("@/locales/sk"),
  hu: () => import("@/locales/hu"),
  ro: () => import("@/locales/ro"),
  bg: () => import("@/locales/bg"),
  ru: () => import("@/locales/ru"),
  uk: () => import("@/locales/uk"),
  be: () => import("@/locales/be"),
  lv: () => import("@/locales/lv"),
  et: () => import("@/locales/et"),
  tr: () => import("@/locales/tr"),
  ar: () => import("@/locales/ar"),
  he: () => import("@/locales/he"),
  hi: () => import("@/locales/hi"),
  th: () => import("@/locales/th"),
  km: () => import("@/locales/km"),
  id: () => import("@/locales/id"),
  ms: () => import("@/locales/ms"),
  fil: () => import("@/locales/fil"),
  zh: () => import("@/locales/zh"),
  ja: () => import("@/locales/ja"),
  ko: () => import("@/locales/ko"),
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
