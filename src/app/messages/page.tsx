import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { Inbox } from "@/components/inbox";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("nav.messages") };
}

export default async function MessagesPage() {
  const me = await getUser();
  if (!me) redirect("/login?next=/messages");
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-8 lg:pb-12">
      <h1 className="text-2xl font-extrabold tracking-tight">{t("nav.messages")}</h1>
      <Inbox />
    </div>
  );
}
