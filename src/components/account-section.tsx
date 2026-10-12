"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Mail, UserPlus } from "lucide-react";
import { Avatar } from "./avatar";
import { useT } from "./locale-provider";

type Other = { id: string; displayName: string; handle: string; hue: number; avatarUrl: string };

const post = (action: string, body?: object) =>
  fetch(`/api/auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });

/** Settings: account email, password change, switching between accounts, and logging out. */
export function AccountSection({ email, others }: { email: string; others: Other[] }) {
  const t = useT();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await post("password", { current, next });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) { setCurrent(""); setNext(""); }
    setMsg(r.ok ? { ok: true, text: t("acc.pwChanged") } : { ok: false, text: j.error ?? t("st.saveFail") });
  }

  async function switchTo(id: string) {
    const r = await post("switch", { id });
    if (r.ok) window.location.assign("/settings");
  }

  async function addAccount() {
    await post("stash");
    window.location.assign("/login?add=1");
  }

  async function logout() {
    await post("logout");
    router.push("/");
    router.refresh();
  }

  return (
    <section className="mx-auto max-w-xl px-4 pb-28 lg:pb-12">
      <div className="border-t border-white/10 pt-8">
        <h2 className="text-xl font-extrabold tracking-tight">{t("acc.title")}</h2>

        <div className="mt-4">
          <p className="mb-1.5 text-sm font-semibold">{t("acc.email")}</p>
          <p className="flex items-center gap-2 rounded-xl bg-ink-2 px-4 py-3 text-sm"><Mail className="size-4 shrink-0 text-mist" aria-hidden /> <span className="min-w-0 break-all">{email}</span></p>
        </div>

        <form onSubmit={changePassword} className="mt-6 space-y-3">
          <div>
            <label htmlFor="pw-cur" className="mb-1.5 block text-sm font-semibold">{t("acc.currentPw")}</label>
            <input id="pw-cur" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} className="input" />
          </div>
          <div>
            <label htmlFor="pw-new" className="mb-1.5 block text-sm font-semibold">{t("acc.newPw")}</label>
            <input id="pw-new" type="password" autoComplete="new-password" required minLength={8} maxLength={100} value={next} onChange={(e) => setNext(e.target.value)} className="input" />
            <p className="mt-1 text-xs text-mist">{t("auth.passwordHint")}</p>
          </div>
          {msg && <p role={msg.ok ? "status" : "alert"} className={`rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>{msg.text}</p>}
          <button disabled={busy || !current || next.length < 8} className="btn btn-ghost w-full sm:w-auto">
            {busy && <Loader2 className="size-5 animate-spin" aria-hidden />} {t("acc.changePw")}
          </button>
        </form>

        <div className="mt-8">
          <h3 className="text-sm font-semibold">{t("acc.switch")}</h3>
          {others.length === 0 ? (
            <p className="mt-2 text-sm text-mist">{t("acc.noOthers")}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {others.map((o) => (
                <li key={o.id}>
                  <button type="button" onClick={() => switchTo(o.id)} className="flex w-full items-center gap-3 rounded-xl bg-ink-2 px-3 py-2.5 text-left hover:bg-ink-3">
                    <Avatar name={o.displayName} hue={o.hue} url={o.avatarUrl} size={36} />
                    <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{o.displayName}</span><span className="block truncate text-xs text-mist">@{o.handle}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={addAccount} className="btn btn-ghost mt-3 w-full sm:w-auto"><UserPlus className="size-5" aria-hidden /> {t("acc.addAccount")}</button>
        </div>

        <button type="button" onClick={logout} className="btn mt-8 w-full bg-red-600 text-white hover:bg-red-700 sm:w-auto"><LogOut className="size-5" aria-hidden /> {t("nav.logout")}</button>
      </div>
    </section>
  );
}
