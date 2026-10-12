import { redirect } from "next/navigation";
import { getUser, listOtherAccounts } from "@/lib/auth";
import { mediaUrl } from "@/lib/storage";
import { SettingsForm } from "@/components/settings-form";
import { AccountSection } from "@/components/account-section";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("nav.settings") };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const me = await getUser();
  if (!me) redirect("/login?next=/settings");
  const p = {
    displayName: me.displayName, bio: me.bio, salonName: me.salonName, city: me.city, phone: me.phone,
    bookingUrl: me.bookingUrl, isSalon: me.isSalon, hue: me.hue, avatarUrl: mediaUrl(me.avatarKey), handle: me.handle,
  };
  const others = (await listOtherAccounts(me.id).catch(() => [])).map((u) => ({
    id: u.id, displayName: u.displayName, handle: u.handle, hue: u.hue, avatarUrl: mediaUrl(u.avatarKey),
  }));
  return (
    <>
      <SettingsForm p={p} welcome={(await searchParams).welcome === "1"} />
      <AccountSection email={me.email} others={others} />
    </>
  );
}
