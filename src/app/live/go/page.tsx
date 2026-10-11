import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { closeStaleStreams, platformName } from "@/lib/live";
import { GoLive } from "@/components/go-live";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("go.goLive") };
}

export default async function GoLivePage() {
  const me = await getUser();
  if (!me) redirect("/login?next=/live/go");
  if (!me.isSalon) redirect("/register?salon=1");
  await closeStaleStreams();
  const s = await db.liveStream.findFirst({ where: { creatorId: me.id, status: "LIVE" }, orderBy: { startedAt: "desc" } });
  return (
    <GoLive
      meId={me.id}
      active={s ? { id: s.id, title: s.title, platform: s.platform, platformName: platformName(s.platform), sourceUrl: s.sourceUrl } : null}
    />
  );
}
