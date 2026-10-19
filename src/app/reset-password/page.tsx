import { Suspense } from "react";
import { ResetForm } from "@/components/password-forms";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("auth.resetTitle") };
}

export default function Page() {
  return <Suspense><ResetForm /></Suspense>;
}
