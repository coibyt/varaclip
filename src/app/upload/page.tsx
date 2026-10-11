import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { UploadForm } from "@/components/upload-form";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("nav.upload") };
}

export default async function Page() {
  const me = await getUser();
  if (!me) redirect("/login?next=/upload");
  if (!me.isSalon) redirect("/register?salon=1");
  return <UploadForm />;
}
