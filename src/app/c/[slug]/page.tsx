import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { CATEGORIES, categoryBySlug, categoryName } from "@/lib/categories";
import { videoIdsIn } from "@/lib/video-categories";
import { hydrate, videoInclude } from "@/lib/videos";
import { getT } from "@/lib/i18n-server";
import { VideoGrid } from "@/components/video-grid";
import { CategoryIcon } from "@/components/category-picker";

export const dynamic = "force-dynamic";
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://varaclip.com").replace(/\/$/, "");

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };
// Every video of the category is shown; only very large categories are split into pages of this size.
const PAGE = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = categoryBySlug((await params).slug);
  if (!cat) return {};
  const { t, locale } = await getT();
  const name = categoryName(locale, cat);
  const title = t("cat.pageTitle", { name });
  const description = t("cat.pageDesc", { name });
  const url = `${SITE}/c/${cat.slug}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "website" }, twitter: { card: "summary", title, description } };
}

/** One category: its newest videos in a grid, written so search engines understand the page. */
export default async function CategoryPage({ params, searchParams }: Props) {
  const cat = categoryBySlug((await params).slug);
  if (!cat) notFound();
  const { t, locale } = await getT();
  const name = categoryName(locale, cat);

  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { ids, total } = await videoIdsIn(cat.slug, PAGE, (page - 1) * PAGE);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const rows = ids.length ? await db.video.findMany({ where: { id: { in: ids } }, orderBy: { createdAt: "desc" }, include: videoInclude }) : [];
  const [videos, me] = await Promise.all([hydrate(rows), getUser()]);

  const url = `${SITE}/c/${cat.slug}`;
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: t("cat.pageTitle", { name }),
      description: t("cat.pageDesc", { name }),
      url,
      inLanguage: locale,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: total,
        itemListElement: videos.slice(0, 30).map((v, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE}/v/${v.id}`,
          item: {
            "@type": "VideoObject",
            name: (v.caption || `${name} · ${v.creator.salonName || v.creator.displayName}`).slice(0, 100),
            description: v.caption || t("cat.pageDesc", { name }),
            thumbnailUrl: v.thumbUrl || undefined,
            uploadDate: v.createdAt,
            contentUrl: v.videoUrl,
            embedUrl: `${SITE}/embed/v/${v.id}`,
            ...(v.duration ? { duration: `PT${Math.round(v.duration)}S` } : {}),
          },
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "VaraClip", item: SITE },
        { "@type": "ListItem", position: 2, name: t("cat.title"), item: `${SITE}/c` },
        { "@type": "ListItem", position: 3, name, item: url },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-6 lg:pb-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <nav aria-label="Breadcrumb" className="text-sm text-mist">
        <Link href="/" className="hover:underline">VaraClip</Link> <span aria-hidden>›</span>{" "}
        <Link href="/c" className="hover:underline">{t("cat.title")}</Link> <span aria-hidden>›</span> <span className="text-white">{name}</span>
      </nav>

      <header className="mt-4 flex items-start gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-glow/15 text-glow"><CategoryIcon icon={cat.icon} className="size-7" /></span>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t("cat.pageTitle", { name })}</h1>
          <p className="mt-1.5 max-w-2xl text-mist">{t("cat.pageDesc", { name })}</p>
          <p className="mt-1 text-sm text-white/70">{t("cat.count", { n: total })}</p>
        </div>
      </header>

      <nav aria-label={t("cat.title")} className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4">
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug} href={`/c/${c.slug}`} aria-current={c.slug === cat.slug ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${c.slug === cat.slug ? "border-glow bg-glow/15 text-glow" : "border-white/10 bg-ink-2 hover:border-white/30"}`}
          >
            <CategoryIcon icon={c.icon} className="size-4" /> {categoryName(locale, c)}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        <VideoGrid showViews={isAdminUser(me)} videos={videos} empty={t("cat.empty")} watch={t("studio.watch")} locale={locale} />
      </div>
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex flex-wrap justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={n === 1 ? `/c/${cat.slug}` : `/c/${cat.slug}?page=${n}`} aria-current={n === page ? "page" : undefined}
              className={`grid size-10 place-items-center rounded-full text-sm font-bold ${n === page ? "bg-glow text-white" : "bg-ink-2 hover:bg-ink-3"}`}>{n}</Link>
          ))}
        </nav>
      )}
    </div>
  );
}
