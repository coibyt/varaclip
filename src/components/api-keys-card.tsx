"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, KeyRound, Loader2, Trash2 } from "lucide-react";
import { timeAgo } from "@/lib/util";
import { useI18n } from "./locale-provider";

type Key = { id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null };

/** Settings: API keys for the salon's own posting software (create, copy once, revoke). */
export function ApiKeysCard() {
  const { t, locale } = useI18n();
  const [keys, setKeys] = useState<Key[] | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fresh, setFresh] = useState("");
  const [copied, setCopied] = useState(false);

  async function load() {
    const r = await fetch("/api/keys", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setKeys(j.keys);
    else { setKeys([]); setError(j.error ?? ""); }
  }
  useEffect(() => { void load(); }, []);

  async function create() {
    setBusy(true);
    setError("");
    const r = await fetch("/api/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setError(j.error ?? t("st.saveFail"));
    setFresh(j.key);
    setName("");
    void load();
  }

  async function revoke(id: string) {
    if (!window.confirm(t("api.revokeConfirm"))) return;
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    void load();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(fresh);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t("api.copy"), fresh);
    }
  }

  return (
    <div className="mt-8 rounded-3xl border border-white/10 bg-ink-2/60 p-5">
      <h3 className="flex items-center gap-2 text-lg font-extrabold"><KeyRound className="size-5 text-gold" aria-hidden /> {t("api.title")}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-mist">{t("api.desc")}</p>

      {fresh && (
        <div className="mt-4 rounded-2xl border border-gold/40 bg-gold/10 p-3">
          <p className="text-sm font-semibold">{t("api.newKey")}</p>
          <div className="mt-2 flex gap-2">
            <input readOnly value={fresh} onFocus={(e) => e.currentTarget.select()} className="input min-w-0 flex-1 font-mono !text-xs" />
            <button type="button" onClick={copy} className="btn btn-primary shrink-0 !px-4">{copied ? <Check className="size-5" aria-hidden /> : <Copy className="size-5" aria-hidden />} <span className="sr-only sm:not-sr-only">{copied ? t("studio.copied") : t("api.copy")}</span></button>
          </div>
        </div>
      )}

      {keys === null ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-mist"><Loader2 className="size-4 animate-spin" aria-hidden /></p>
      ) : keys.length === 0 ? (
        <p className="mt-4 text-sm text-mist">{t("api.none")}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center gap-3 rounded-xl bg-ink-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{k.name}</p>
                <p className="truncate font-mono text-xs text-mist">{k.prefix}…</p>
                <p className="text-xs text-mist">{k.lastUsedAt ? t("api.lastUsed", { when: timeAgo(k.lastUsedAt, locale, t("time.now")) }) : t("api.neverUsed")}</p>
              </div>
              <button type="button" onClick={() => revoke(k.id)} className="btn btn-ghost shrink-0 !min-h-[40px] !px-3 text-sm text-red-300"><Trash2 className="size-4" aria-hidden /> {t("api.revoke")}</button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={t("api.namePh")} aria-label={t("api.namePh")} className="input min-w-0 flex-1" />
        <button type="button" onClick={create} disabled={busy} className="btn btn-ghost shrink-0">{busy && <Loader2 className="size-5 animate-spin" aria-hidden />} {t("api.create")}</button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
      <Link href="/api-docs" className="mt-3 inline-block text-sm font-semibold text-glow hover:underline">{t("api.docs")} →</Link>
    </div>
  );
}
