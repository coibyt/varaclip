import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("auth.register") };
}

export default function Page() {
  return <Suspense><AuthForm mode="register" /></Suspense>;
}
