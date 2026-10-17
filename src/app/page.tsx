import { getUser } from "@/lib/auth";
import { forYou, hydrate } from "@/lib/videos";
import { VideoFeed } from "@/components/video-feed";
import { isAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [me, rows] = await Promise.all([getUser(), forYou(8)]);
  return <VideoFeed initial={await hydrate(rows)} meId={me?.id ?? null} isAdmin={isAdminUser(me)} />;
}
