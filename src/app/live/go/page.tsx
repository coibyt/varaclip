import Link from "next/link";
import { redirect } from "next/navigation";
import { Radio, Video } from "lucide-react";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { LIVE_MIN_FOLLOWERS, closeStaleStreams, platformName } from "@/lib/live";
import { GoLive } from "@/components/go-live";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("go.goLive") };
}

export default async function GoLivePage() {
  const { t } = await getT();
  const me = await getUser();
  if (!me) redirect("/login?next=/live/go");
  if (!me.isSalon) redirect("/register?salon=1");
  const followers = await db.follow.count({ where: { followingId: me.id } });
  if (followers < LIVE_MIN_FOLLOWERS) {
    const pct = Math.round((followers / LIVE_MIN_FOLLOWERS) * 100);
    return (
      <div className="mx-auto max-w-md px-4 pb-28 pt-16 text-center lg:pb-12">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-red-500/15"><Radio className="size-8 text-red-400" aria-hidden /></span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight">{t("go.gateTitle")}</h1>
        <p className="mt-3 text-white/85">{t("go.gateBody", { need: LIVE_MIN_FOLLOWERS, count: followers })}</p>
        <div className="mx-auto mt-5 h-2 max-w-xs overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={followers} aria-valuemin={0} aria-valuemax={LIVE_MIN_FOLLOWERS}>
          <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-sm tabular-nums text-mist">{followers} / {LIVE_MIN_FOLLOWERS}</p>
        <Link href="/upload" className="btn btn-primary mt-6 w-full"><Video className="size-5" aria-hidden /> {t("go.gateCta")}</Link>
      </div>
    );
  }
  await closeStaleStreams();
  const s = await db.liveStream.findFirst({ where: { creatorId: me.id, status: "LIVE" }, orderBy: { startedAt: "desc" } });
  return (
    <GoLive
      meId={me.id}
      active={s ? { id: s.id, title: s.title, platform: s.platform, platformName: platformName(s.platform), sourceUrl: s.sourceUrl } : null}
    />
  );
}
