import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { mediaUrl } from "@/lib/storage";
import { EmbedPlayer } from "@/components/embed-player";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

/** Bare player (no menus) meant for <iframe> embeds, e.g. on VaraaAi or a salon's own website. */
export default async function EmbedPage({ params }: { params: Promise<{ id: string }> }) {
  const v = await db.video.findUnique({
    where: { id: (await params).id },
    select: { id: true, videoKey: true, thumbKey: true, creator: { select: { salonName: true, displayName: true, handle: true } } },
  });
  if (!v) notFound();
  return (
    <EmbedPlayer
      id={v.id}
      src={mediaUrl(v.videoKey)}
      poster={mediaUrl(v.thumbKey)}
      name={v.creator.salonName || v.creator.displayName}
    />
  );
}
