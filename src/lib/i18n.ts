/**
 * Shared (server + client) i18n helpers. No Next.js imports here so client
 * components can use it too.
 */
export const LOCALES = [
  { code: "vi", name: "Tiếng Việt" },
  { code: "en", name: "English" },
  { code: "fi", name: "Suomi" },
  { code: "sv", name: "Svenska" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "pt", name: "Português" },
  { code: "it", name: "Italiano" },
  { code: "ru", name: "Русский" },
  { code: "zh", name: "简体中文" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "th", name: "ไทย" },
  { code: "id", name: "Bahasa Indonesia" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "gr_lang";

export const isLocale = (v: unknown): v is Locale => LOCALES.some((l) => l.code === v);

export type Messages = Record<string, string>;

/** Replace {name} placeholders. */
export function format(str: string, vars?: Record<string, string | number>) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function makeT(messages: Messages, fallback: Messages) {
  return (key: string, vars?: Record<string, string | number>) => format(messages[key] ?? fallback[key] ?? key, vars);
}
export type T = ReturnType<typeof makeT>;

/** ISO country code → one of our locales. Countries not listed fall back to English. */
const COUNTRY_LANG: Record<string, Locale> = {
  VN: "vi",
  FI: "fi",
  SE: "sv", AX: "fi",
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es", EC: "es", GT: "es", CU: "es", BO: "es",
  DO: "es", HN: "es", PY: "es", SV: "es", NI: "es", CR: "es", PA: "es", UY: "es", PR: "es", GQ: "es",
  FR: "fr", BE: "fr", LU: "fr", MC: "fr", SN: "fr", CI: "fr", CM: "fr", CD: "fr", MG: "fr", ML: "fr", BF: "fr",
  NE: "fr", TD: "fr", GN: "fr", RW: "fr", BJ: "fr", HT: "fr", TG: "fr", DZ: "fr", TN: "fr", MA: "fr", GA: "fr", CG: "fr",
  DE: "de", AT: "de", LI: "de", CH: "de",
  PT: "pt", BR: "pt", AO: "pt", MZ: "pt", CV: "pt", GW: "pt", ST: "pt", TL: "pt",
  IT: "it", SM: "it", VA: "it",
  RU: "ru", BY: "ru", KZ: "ru", KG: "ru", TJ: "ru", UZ: "ru", TM: "ru", MD: "ru",
  CN: "zh", TW: "zh", HK: "zh", MO: "zh", SG: "zh",
  JP: "ja",
  KR: "ko", KP: "ko",
  TH: "th",
  ID: "id",
  US: "en", GB: "en", CA: "en", AU: "en", NZ: "en", IE: "en", IN: "en", PH: "en", ZA: "en", NG: "en", KE: "en",
};

export const localeFromCountry = (cc: string | null | undefined): Locale | null => COUNTRY_LANG[(cc ?? "").toUpperCase()] ?? null;

/** Pick the best supported locale from an Accept-Language header. */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const prefs = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .filter((p) => p.tag && p.tag !== "*")
    .sort((a, b) => b.q - a.q);
  for (const { tag } of prefs) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
    if (base === "nb" || base === "nn" || base === "no" || base === "da") return "sv"; // nearest supported Nordic language
  }
  return null;
}

/** Country headers set by CDNs/proxies in front of the app. */
export const COUNTRY_HEADERS = [
  "cf-ipcountry",
  "x-vercel-ip-country",
  "cloudfront-viewer-country",
  "x-country-code",
  "x-geo-country",
  "x-hcdn-country",
  "x-appengine-country",
];
