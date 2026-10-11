import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, Heart, MessageCircle, Plus, Users } from "lucide-react";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { hydrate, videoInclude } from "@/lib/videos";
import { compact } from "@/lib/util";
import { StudioRow } from "@/components/studio-row";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("studio.title") };
}

export default async function Studio() {
  const { t, locale } = await getT();
  const me = await getUser();
  if (!me) redirect("/login?next=/studio");
  if (!me.isSalon) redirect("/register?salon=1");

  const [rows, followers, likes, comments] = await Promise.all([
    db.video.findMany({ where: { creatorId: me.id }, orderBy: { createdAt: "desc" }, include: videoInclude }),
    db.follow.count({ where: { followingId: me.id } }),
    db.like.count({ where: { video: { creatorId: me.id } } }),
    db.comment.count({ where: { video: { creatorId: me.id } } }),
  ]);
  const videos = await hydrate(rows);
  const views = rows.reduce((s, v) => s + v.views, 0);

  const stats = [
    { label: t("studio.views"), value: views, icon: Eye },
    { label: t("studio.likes"), value: likes, icon: Heart },
    { label: t("studio.comments"), value: comments, icon: MessageCircle },
    { label: t("studio.followers"), value: followers, icon: Users },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-8 lg:pb-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight">{t("studio.title")}</h1>
        <Link href="/upload" className="btn btn-primary"><Plus className="size-5" aria-hidden /> {t("nav.upload")}</Link>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-ink-2 p-4">
            <s.icon className="size-5 text-glow" aria-hidden />
            <dd className="mt-2 text-2xl font-extrabold tabular-nums">{compact(s.value, locale)}</dd>
            <dt className="text-xs text-mist">{s.label}</dt>
          </div>
        ))}
      </dl>

      <h2 className="mb-3 mt-10 text-sm font-bold uppercase tracking-wider text-mist">{t("studio.yourVideos", { n: videos.length })}</h2>
      {videos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
          <p className="font-bold">{t("studio.emptyTitle")}</p>
          <p className="mt-1 text-sm text-mist">{t("studio.emptySub")}</p>
          <Link href="/upload" className="btn btn-primary mt-4">{t("nav.upload")}</Link>
        </div>
      ) : (
        <ul className="space-y-3">{videos.map((v) => <StudioRow key={v.id} v={v} />)}</ul>
      )}
    </div>
  );
}
