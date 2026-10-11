import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { closeStaleStreams, embedSrc, platformName } from "@/lib/live";
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
  const me = await getUser();
  const followed = me ? Boolean(await db.follow.findUnique({ where: { followerId_followingId: { followerId: me.id, followingId: s.creatorId } } })) : false;

  return (
    <LiveWatch
      streamId={s.id}
      title={s.title}
      platform={s.platform}
      platformName={platformName(s.platform)}
      sourceUrl={s.sourceUrl}
      embedSrc={embedSrc(s)}
      initialStatus={s.status}
      meId={me?.id ?? null}
      followed={followed}
      creator={{ ...s.creator, avatarUrl: mediaUrl(s.creator.avatarKey) }}
    />
  );
}
