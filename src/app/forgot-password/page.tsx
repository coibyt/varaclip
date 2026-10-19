import { ForgotForm } from "@/components/password-forms";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("auth.forgotTitle") };
}

export default function Page() {
  return <ForgotForm />;
}
