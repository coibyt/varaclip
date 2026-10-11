import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/storage";
import { SettingsForm } from "@/components/settings-form";

export const metadata = { title: "Cài đặt" };

export default async function Page({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const me = await getUser();
  if (!me) redirect("/login?next=/settings");
  const p = {
    displayName: me.displayName, bio: me.bio, salonName: me.salonName, city: me.city, phone: me.phone,
    bookingUrl: me.bookingUrl, isSalon: me.isSalon, hue: me.hue, avatarUrl: mediaUrl(me.avatarKey), handle: me.handle,
  };
  return <SettingsForm p={p} welcome={(await searchParams).welcome === "1"} />;
}
