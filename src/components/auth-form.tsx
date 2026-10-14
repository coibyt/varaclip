"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Scissors, User } from "lucide-react";
import { useT } from "./locale-provider";
import { LanguageSwitcher } from "./language-switcher";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const t = useT();
  const sp = useSearchParams();
  const next = sp.get("next") && sp.get("next")!.startsWith("/") ? sp.get("next")! : "/";
  const adding = sp.get("add") === "1";
  const [mailOk, setMailOk] = useState(true);
  const [smsOk, setSmsOk] = useState(true);
  const [isSalon, setIsSalon] = useState(sp.get("salon") === "1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reg = mode === "register";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(f.entries());
    if (reg) {
      body.isSalon = isSalon;
      body.marketingEmail = mailOk;
      body.marketingSms = smsOk;
    }
    if (adding) body.add = true;
    const r = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) {
      setBusy(false);
      return setError(j.error ?? t("auth.genericError"));
    }
    router.push(reg && isSalon ? "/settings?welcome=1" : next);
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10 pb-24 lg:pb-10">
      <h1 className="font-display text-4xl font-bold tracking-tight">{reg ? t("auth.createTitle") : t("auth.loginTitle")}</h1>
      <p className="mt-2 text-mist">{reg ? t("auth.createSub") : t("auth.loginSub")}</p>
      {adding && <p className="mt-3 rounded-xl bg-ink-2 px-4 py-3 text-sm text-white/85">{t("acc.addingHint")}</p>}

      {reg && (
        <div className="mt-6 grid grid-cols-2 gap-3" role="radiogroup" aria-label={t("auth.accountType")}>
          {[
            { v: false, label: t("auth.viewer"), sub: t("auth.viewerSub"), icon: User },
            { v: true, label: t("auth.owner"), sub: t("auth.ownerSub"), icon: Scissors },
          ].map((o) => (
            <button
              key={o.label} type="button" role="radio" aria-checked={isSalon === o.v} onClick={() => setIsSalon(o.v)}
              className={`cursor-pointer rounded-2xl border p-4 text-left transition ${isSalon === o.v ? "border-glow bg-glow/10" : "border-white/10 bg-ink-2 hover:border-white/25"}`}
            >
              <o.icon className={`size-6 ${isSalon === o.v ? "text-glow" : "text-mist"}`} aria-hidden />
              <span className="mt-2 block font-bold">{o.label}</span>
              <span className="block text-xs text-mist">{o.sub}</span>
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4">
        {reg && (
          <>
            <Field label={t("auth.displayName")} name="displayName" autoComplete="name" required minLength={2} />
            <Field label={t("auth.handle")} name="handle" autoComplete="username" required hint={t("auth.handleHint")} pattern="[a-zA-Z0-9_.]{3,24}" />
            {isSalon && (
              <>
                <Field label={t("auth.salonName")} name="salonName" required />
                <Field label={t("auth.city")} name="city" autoComplete="address-level2" />
              </>
            )}
          </>
        )}
        <Field label={t("auth.email")} name="email" type="email" autoComplete="email" required />
        {reg && <Field label={t("auth.phoneOpt")} name="phone" type="tel" autoComplete="tel" maxLength={30} />}
        <Field label={t("auth.password")} name="password" type="password" autoComplete={reg ? "new-password" : "current-password"} required minLength={reg ? 8 : 1} hint={reg ? t("auth.passwordHint") : undefined} />

        {reg && (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">{t("auth.marketTitle")}</legend>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={mailOk} onChange={(e) => setMailOk(e.target.checked)} className="size-5 accent-[#FF4D8D]" /> {t("auth.byEmail")}</label>
              <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={smsOk} onChange={(e) => setSmsOk(e.target.checked)} className="size-5 accent-[#FF4D8D]" /> {t("auth.bySms")}</label>
            </div>
          </fieldset>
        )}

        {error && <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

        <button disabled={busy} className="btn btn-primary w-full">
          {busy && <Loader2 className="size-5 animate-spin" aria-hidden />} {reg ? t("auth.submitCreate") : t("auth.submitLogin")}
        </button>
      </form>

      {reg && <p className="mt-4 text-center text-xs leading-relaxed text-mist"><AgreeNotice /></p>}

      <p className="mt-6 text-center text-sm text-mist">
        {reg ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
        <Link href={`${reg ? "/login" : "/register"}${adding ? "?add=1" : ""}`} className="font-bold text-glow hover:underline">{reg ? t("auth.submitLogin") : t("auth.register")}</Link>
      </p>
      <LanguageSwitcher className="mx-auto mt-6 w-fit" />
    </div>
  );
}

/** "By continuing, I agree to the Terms of Use and Privacy Policy of VaraClip.com", with both names as links. */
function AgreeNotice() {
  const t = useT();
  const parts = t("auth.agree", { terms: "\u0001T", privacy: "\u0001P" }).split(/(\u0001T|\u0001P)/);
  const link = "font-semibold text-white underline underline-offset-2 hover:text-glow";
  return (
    <>
      {parts.map((p, i) =>
        p === "\u0001T" ? <Link key={i} href="/terms" target="_blank" className={link}>{t("auth.terms")}</Link>
        : p === "\u0001P" ? <Link key={i} href="/privacy" target="_blank" className={link}>{t("auth.privacy")}</Link>
        : <span key={i}>{p}</span>,
      )}
    </>
  );
}

function Field({ label, hint, ...p }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `f-${p.name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{label}</label>
      <input id={id} {...p} className="input" />
      {hint && <p className="mt-1 text-xs text-mist">{hint}</p>}
    </div>
  );
}
