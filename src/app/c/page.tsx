import Link from "next/link";
import type { Metadata } from "next";
import { CATEGORIES, categoryName } from "@/lib/categories";
import { categoryCounts } from "@/lib/video-categories";
import { getT } from "@/lib/i18n-server";
import { CategoryIcon } from "@/components/category-picker";

export const dynamic = "force-dynamic";
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://varaclip.com").replace(/\/$/, "");

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("cat.title"),
    description: t("cat.indexIntro"),
    alternates: { canonical: `${SITE}/c` },
    openGraph: { title: t("cat.title"), description: t("cat.indexIntro"), url: `${SITE}/c`, type: "website" },
  };
}

/** All video categories, like the category grid on VaraaAi.com. */
export default async function CategoriesPage() {
  const { t, locale } = await getT();
  const counts = await categoryCounts();
  const ld = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("cat.title"),
    description: t("cat.indexIntro"),
    url: `${SITE}/c`,
    hasPart: CATEGORIES.map((c) => ({ "@type": "CollectionPage", name: categoryName(locale, c), url: `${SITE}/c/${c.slug}` })),
  };
  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-8 lg:pb-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t("cat.title")}</h1>
      <p className="mt-2 max-w-2xl text-mist">{t("cat.indexIntro")}</p>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CATEGORIES.map((c) => (
          <li key={c.slug}>
            <Link href={`/c/${c.slug}`} className="flex h-full flex-col items-center gap-3 rounded-3xl border border-white/10 bg-ink-2 p-5 text-center transition hover:border-glow/60 hover:bg-ink-3">
              <span className="grid size-16 place-items-center rounded-2xl bg-glow/15 text-glow"><CategoryIcon icon={c.icon} className="size-7" /></span>
              <span className="font-bold leading-tight">{categoryName(locale, c)}</span>
              {counts && <span className="text-xs text-mist">{t("cat.count", { n: counts.get(c.slug) ?? 0 })}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
