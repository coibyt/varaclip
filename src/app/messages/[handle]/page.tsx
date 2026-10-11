import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { Thread } from "@/components/thread";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("nav.messages") };
}

export default async function ThreadPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const me = await getUser();
  if (!me) redirect(`/login?next=${encodeURIComponent(`/messages/${handle}`)}`);
  const other = await db.user.findUnique({ where: { handle }, select: { id: true } });
  if (!other) notFound();
  if (other.id === me.id) redirect("/messages");
  return <Thread handle={handle} />;
}
