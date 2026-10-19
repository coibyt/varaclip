"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useT } from "./locale-provider";

const shell = "mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10 pb-24 lg:pb-10";

async function post(action: string, body: object) {
  const r = await fetch(`/api/auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: r.ok, data: await r.json().catch(() => ({})) as { error?: string } };
}

/** "Forgot password": asks for the email and sends the reset link. */
export function ForgotForm() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await post("forgot", { email });
    setBusy(false);
    if (r.ok) setSent(true);
    else setError(r.data.error ?? t("auth.genericError"));
  }

  return (
    <div className={shell}>
      <h1 className="font-display text-3xl font-bold tracking-tight">{t("auth.forgotTitle")}</h1>
      {sent ? (
        <p role="status" className="mt-5 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{t("auth.linkSent")}</p>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <p className="text-mist">{t("auth.forgotSub")}</p>
          <div>
            <label htmlFor="fp-email" className="mb-1.5 block text-sm font-semibold">{t("auth.email")}</label>
            <input id="fp-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
          </div>
          {error && <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
          <button disabled={busy} className="btn btn-primary w-full">{busy && <Loader2 className="size-5 animate-spin" aria-hidden />} {t("auth.sendLink")}</button>
        </form>
      )}
      <Link href="/login" className="mt-6 text-center text-sm font-bold text-glow hover:underline">{t("auth.toLogin")}</Link>
    </div>
  );
}

/** Opened from the email: choose a new password. */
export function ResetForm() {
  const t = useT();
  const token = useSearchParams().get("token") ?? "";
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await post("reset", { token, password: pw });
    setBusy(false);
    if (r.ok) setDone(true);
    else setError(r.data.error ?? t("auth.resetBad"));
  }

  return (
    <div className={shell}>
      <h1 className="font-display text-3xl font-bold tracking-tight">{t("auth.resetTitle")}</h1>
      {done ? (
        <>
          <p role="status" className="mt-5 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{t("auth.resetDone")}</p>
          <Link href="/login" className="btn btn-primary mt-6 w-full">{t("auth.toLogin")}</Link>
        </>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="rp-pw" className="mb-1.5 block text-sm font-semibold">{t("acc.newPw")}</label>
            <input id="rp-pw" type="password" required minLength={8} maxLength={100} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className="input" />
            <p className="mt-1 text-xs text-mist">{t("auth.passwordHint")}</p>
          </div>
          {error && <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
          <button disabled={busy || !token} className="btn btn-primary w-full">{busy && <Loader2 className="size-5 animate-spin" aria-hidden />} {t("auth.resetSubmit")}</button>
        </form>
      )}
    </div>
  );
}

/** Button on the unsubscribe page. */
export function UnsubscribeButton({ u, tkn }: { u: string; tkn: string }) {
  const t = useT();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  async function go() {
    setState("busy");
    const r = await fetch("/api/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ u, t: tkn }) });
    setState(r.ok ? "done" : "error");
  }
  if (state === "done") return <p role="status" className="mt-5 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{t("auth.unsubDone")}</p>;
  return (
    <>
      {state === "error" && <p role="alert" className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{t("auth.resetBad")}</p>}
      <button onClick={go} disabled={state === "busy"} className="btn btn-primary mt-6 w-full">{state === "busy" && <Loader2 className="size-5 animate-spin" aria-hidden />} {t("auth.unsubBtn")}</button>
    </>
  );
}

/** Opened from the sign-up confirmation email: creates the account and signs the person in. */
export function ConfirmSignup() {
  const t = useT();
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await post("confirm", { token });
      if (cancelled) return;
      if (r.ok) {
        const d = r.data as { isSalon?: boolean };
        router.push(d.isSalon ? "/settings?welcome=1" : "/");
        router.refresh();
      } else {
        setError(r.data.error ?? t("auth.confirmBad"));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className={`${shell} items-center text-center`}>
      {error ? (
        <>
          <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
          <Link href="/register" className="btn btn-primary mt-6">{t("auth.register")}</Link>
        </>
      ) : (
        <p className="flex items-center gap-2 text-mist"><Loader2 className="size-5 animate-spin" aria-hidden /> {t("auth.confirming")}</p>
      )}
    </div>
  );
}
