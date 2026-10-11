import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { forYou, hydrate, videoInclude } from "@/lib/videos";
import { mediaUrl } from "@/lib/storage";
import { VideoFeed } from "@/components/video-feed";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const v = await db.video.findUnique({ where: { id: (await params).id }, include: { creator: true } });
  if (!v) return {};
  const title = `${v.creator.salonName || v.creator.displayName} (@${v.creator.handle})`;
  return {
    title,
    description: v.caption || "Video làm đẹp",
    openGraph: { title, description: v.caption, type: "video.other", videos: [mediaUrl(v.videoKey)], images: v.thumbKey ? [mediaUrl(v.thumbKey)] : [] },
  };
}

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const first = await db.video.findUnique({ where: { id }, include: videoInclude });
  if (!first) notFound();
  const [me, more] = await Promise.all([getUser(), forYou(6, [id])]);
  return <VideoFeed initial={await hydrate([first, ...more])} meId={me?.id ?? null} />;
}
