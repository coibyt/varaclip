/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Eye, Radio } from "lucide-react";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { closeStaleStreams, customerHost, liveConfigured, viewerCount } from "@/lib/live";
import { mediaUrl } from "@/lib/storage";
import { Avatar } from "@/components/avatar";
import { AutoRefresh } from "@/components/auto-refresh";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("nav.live") };
}

export default async function LivePage() {
  const { t } = await getT();
  await closeStaleStreams();
  const [me, rows] = await Promise.all([
    getUser(),
    db.liveStream.findMany({
      where: { status: "LIVE" },
      orderBy: { startedAt: "desc" },
      take: 30,
      include: { creator: { select: { handle: true, displayName: true, salonName: true, city: true, hue: true, avatarKey: true } } },
    }),
  ]);
  const streams = await Promise.all(rows.map(async (s) => ({ ...s, viewers: await viewerCount(s.id) })));

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-8 lg:pb-12">
      <AutoRefresh seconds={15} />
      <div className="flex items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight"><Radio className="size-6 text-red-500" aria-hidden /> {t("nav.live")}</h1>
        {me?.isSalon && liveConfigured() && <Link href="/live/go" className="btn btn-primary"><Radio className="size-5" aria-hidden /> {t("go.goLive")}</Link>}
      </div>

      {streams.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-white/15 p-10 text-center">
          <p className="font-bold">{t("live.none")}</p>
          <p className="mt-1 text-sm text-mist">{me?.isSalon ? t("live.noneSalon") : t("live.noneViewer")}</p>
          {me?.isSalon && liveConfigured() && <Link href="/live/go" className="btn btn-primary mt-4">{t("go.goLive")}</Link>}
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {streams.map((s) => (
            <li key={s.id}>
              <Link href={`/live/${s.id}`} className="group relative block aspect-[9/16] overflow-hidden rounded-2xl bg-ink-3">
                {liveConfigured() && (
                  <img src={`https://${customerHost()}/${s.cfInputId}/thumbnails/thumbnail.jpg?height=640`} alt="" loading="lazy" className="size-full object-cover transition duration-300 group-hover:scale-105" />
                )}
                <div className="absolute left-2 top-2 flex gap-1.5">
                  <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-[11px] font-extrabold uppercase">{t("live.badge")}</span>
                  <span className="flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-bold tabular-nums"><Eye className="size-3" aria-hidden /> {s.viewers}</span>
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-10">
                  <div className="flex items-center gap-2">
                    <Avatar name={s.creator.displayName} hue={s.creator.hue} url={mediaUrl(s.creator.avatarKey)} size={28} />
                    <span className="min-w-0 truncate text-sm font-bold">{s.creator.salonName || s.creator.displayName}</span>
                  </div>
                  {s.title && <p className="mt-1 line-clamp-2 text-xs text-white/85">{s.title}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
