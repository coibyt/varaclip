import { getT } from "@/lib/i18n-server";
import { checkUnsubscribe } from "@/lib/mail";
import { UnsubscribeButton } from "@/components/password-forms";

export const dynamic = "force-dynamic";

/** Opened from the link at the bottom of every marketing email. */
export default async function Page({ searchParams }: { searchParams: Promise<{ u?: string; t?: string }> }) {
  const { t } = await getT();
  const sp = await searchParams;
  const valid = Boolean(sp.u && sp.t && checkUnsubscribe(sp.u, sp.t));
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 pb-24 text-center">
      <h1 className="font-display text-2xl font-bold tracking-tight">{t("auth.unsubTitle")}</h1>
      {valid ? (
        <>
          <p className="mt-3 text-mist">{t("auth.unsubSub")}</p>
          <UnsubscribeButton u={sp.u!} tkn={sp.t!} />
        </>
      ) : (
        <p className="mt-3 text-red-300">{t("auth.resetBad")}</p>
      )}
    </div>
  );
}
