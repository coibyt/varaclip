import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { liveConfigured } from "@/lib/live";
import { Broadcaster } from "@/components/broadcaster";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("go.goLive") };
}

export default async function GoLivePage() {
  const me = await getUser();
  if (!me) redirect("/login?next=/live/go");
  if (!me.isSalon) redirect("/register?salon=1");
  const { t } = await getT();

  if (!liveConfigured()) {
    return (
      <div className="mx-auto max-w-md px-4 pb-28 pt-16 text-center lg:pb-12">
        <h1 className="text-xl font-extrabold">{t("go.notConfiguredTitle")}</h1>
        <p className="mt-2 text-mist">{t("go.notConfigured")}</p>
      </div>
    );
  }
  return <Broadcaster meId={me.id} />;
}
