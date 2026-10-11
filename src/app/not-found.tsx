import Link from "next/link";
import { getT } from "@/lib/i18n-server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="text-6xl font-extrabold text-glow">404</p>
        <p className="mt-2 text-lg font-bold">{t("nf.title")}</p>
        <Link href="/" className="btn btn-primary mt-6">{t("nf.home")}</Link>
      </div>
    </div>
  );
}
