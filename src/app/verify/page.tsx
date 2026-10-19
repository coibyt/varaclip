import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n-server";
import { hashToken } from "@/lib/mail";

export const dynamic = "force-dynamic";

/** Opened from the welcome email: confirms the email address. */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { t } = await getT();
  const token = (await searchParams).token ?? "";
  let ok = false;
  if (token.length >= 20) {
    const row = await db.emailToken.findFirst({ where: { tokenHash: hashToken(token), type: "verify", expiresAt: { gt: new Date() } } }).catch(() => null);
    if (row) {
      if (!row.usedAt) await db.emailToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
      ok = true;
    }
  }
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 pb-24 text-center">
      <Icon className={`size-14 ${ok ? "text-emerald-400" : "text-red-400"}`} aria-hidden />
      <p className="mt-4 text-lg font-bold">{ok ? t("auth.verifyOk") : t("auth.verifyBad")}</p>
      <Link href={ok ? "/" : "/login"} className="btn btn-primary mt-6">{ok ? "VaraClip" : t("auth.toLogin")}</Link>
    </div>
  );
}
