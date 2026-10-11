import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { closeStaleStreams, liveConfigured, playerUrl } from "@/lib/live";
import { mediaUrl } from "@/lib/storage";
import { LiveWatch } from "@/components/live-watch";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const s = await db.liveStream.findUnique({ where: { id: (await params).id }, include: { creator: true } });
  if (!s) return {};
  return { title: s.title || s.creator.salonName || s.creator.displayName };
}

export default async function LiveStreamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await closeStaleStreams();
  const s = await db.liveStream.findUnique({
    where: { id },
    include: { creator: { select: { id: true, handle: true, displayName: true, salonName: true, hue: true, avatarKey: true, bookingUrl: true, phone: true } } },
  });
  if (!s) notFound();
  const { t } = await getT();
  const me = await getUser();
  const followed = me ? Boolean(await db.follow.findUnique({ where: { followerId_followingId: { followerId: me.id, followingId: s.creatorId } } })) : false;

  if (!liveConfigured() && s.status === "LIVE") {
    return <p className="p-10 text-center text-mist">{t("err.liveOff")}</p>;
  }

  return (
    <LiveWatch
      streamId={s.id}
      title={s.title}
      playerSrc={liveConfigured() ? playerUrl(s.cfInputId) : ""}
      initialStatus={s.status}
      meId={me?.id ?? null}
      followed={followed}
      creator={{ ...s.creator, avatarUrl: mediaUrl(s.creator.avatarKey) }}
    />
  );
}
