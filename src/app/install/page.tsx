import { InstallPanel } from "@/components/install-app";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("pwa.install") };
}

export default function Page() {
  return <InstallPanel />;
}
