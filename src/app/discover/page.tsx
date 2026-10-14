import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { hydrate, videoInclude } from "@/lib/videos";
import { VideoGrid } from "@/components/video-grid";
import { Avatar } from "@/components/avatar";
import { mediaUrl } from "@/lib/storage";
import { getT } from "@/lib/i18n-server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { TrackSearch } from "@/components/track-search";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("dc.title") };
}

export default async function Discover({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { t, locale } = await getT();
  const q = ((await searchParams).q ?? "").trim().slice(0, 60);
  const isTag = q.startsWith("#");
  const term = q.replace(/^#/, "").toLowerCase();

  const [rows, salons, tagRows] = await Promise.all([
    db.video.findMany({
      where: term
        ? isTag
          ? { tags: { contains: term } }
          : { OR: [{ caption: { contains: term } }, { tags: { contains: term } }, { creator: { OR: [{ salonName: { contains: term } }, { displayName: { contains: term } }, { handle: { contains: term } }, { city: { contains: term } }] } }] }
        : {},
      orderBy: term ? { createdAt: "desc" } : { views: "desc" },
      take: 60,
      include: videoInclude,
    }),
    term && !isTag
      ? db.user.findMany({ where: { isSalon: true, OR: [{ salonName: { contains: term } }, { displayName: { contains: term } }, { handle: { contains: term } }, { city: { contains: term } }] }, take: 8 })
      : Promise.resolve([]),
    db.video.findMany({ select: { tags: true }, orderBy: { createdAt: "desc" }, take: 300 }),
  ]);

  const counts = new Map<string, number>();
  for (const t of tagRows) for (const tag of t.tags.split(" ").filter(Boolean)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  const trending = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-6 lg:pb-12">
      <TrackSearch q={q} />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">{t("dc.title")}</h1>
        <LanguageSwitcher className="lg:hidden" />
      </div>

      <form action="/discover" role="search" className="relative mt-4">
        <label htmlFor="q" className="sr-only">{t("dc.search")}</label>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-mist" aria-hidden />
        <input id="q" name="q" defaultValue={q} placeholder={t("dc.placeholder")} className="input !rounded-full !pl-12" />
      </form>

      {trending.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
          {trending.map(([t, n]) => (
            <Link key={t} href={`/discover?q=${encodeURIComponent("#" + t)}`} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${q.toLowerCase() === "#" + t ? "border-glow bg-glow/15 text-glow" : "border-white/10 bg-ink-2 hover:border-white/30"}`}>
              #{t} <span className="text-mist">{n}</span>
            </Link>
          ))}
        </div>
      )}

      {salons.length > 0 && (
        <section className="mt-8" aria-label={t("dc.salons")}>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-mist">{t("dc.salons")}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {salons.map((s) => (
              <li key={s.id}>
                <Link href={`/u/${s.handle}`} className="flex items-center gap-3 rounded-2xl bg-ink-2 p-3 transition hover:bg-ink-3">
                  <Avatar name={s.displayName} hue={s.hue} url={mediaUrl(s.avatarKey)} size={48} />
                  <span className="min-w-0"><span className="block truncate font-bold">{s.salonName || s.displayName}</span><span className="block truncate text-sm text-mist">@{s.handle}{s.city ? ` · ${s.city}` : ""}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8" aria-label={t("common.videos")}>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-mist">{term ? t("dc.resultsFor", { q }) : t("dc.mostViewed")}</h2>
        <VideoGrid videos={await hydrate(rows)} empty={t("dc.noResults")} watch={t("studio.watch")} locale={locale} />
      </section>
    </div>
  );
}
