import { LegalPage } from "@/components/legal-page";
import { PRIVACY } from "@/lib/legal-content";
import { getLocale } from "@/lib/i18n-server";

export async function generateMetadata() {
  const c = PRIVACY[(await getLocale()) === "vi" ? "vi" : "en"];
  return { title: c.title };
}

export default async function Page() {
  return <LegalPage c={PRIVACY[(await getLocale()) === "vi" ? "vi" : "en"]} />;
}
