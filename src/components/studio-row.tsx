"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Code2, Copy, Eye, Heart, Link2, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { compact, timeAgo, type FeedVideo } from "@/lib/util";
import { useI18n } from "./locale-provider";

export function StudioRow({ v }: { v: FeedVideo }) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [confirm, setConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(v.caption);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [copied, setCopied] = useState<"link" | "embed" | null>(null);

  // Absolute URLs are only known in the browser (the site can sit behind any domain).
  const links = () => {
    const origin = window.location.origin;
    return {
      link: `${origin}/v/${v.id}`,
      embed: `<iframe src="${origin}/embed/v/${v.id}" width="360" height="640" style="border:0;border-radius:12px;max-width:100%" allow="autoplay; fullscreen" allowfullscreen loading="lazy"></iframe>`,
    };
  };
  async function copy(kind: "link" | "embed") {
    try {
      await navigator.clipboard.writeText(links()[kind]);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt(t(kind === "link" ? "studio.copyLink" : "studio.copyEmbed"), links()[kind]);
    }
  }

  async function del() {
    setBusy(true);
    const r = await fetch(`/api/videos/${v.id}`, { method: "DELETE" });
    if (r.ok) router.refresh();
    else setBusy(false);
  }

  async function save() {
    setBusy(true);
    setError("");
    const r = await fetch(`/api/videos/${v.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caption }),
    });
    setBusy(false);
    if (!r.ok) return setError((await r.json().catch(() => null))?.error ?? t("studio.saveFail"));
    setEditing(false);
    router.refresh();
  }

  return (
    <li className="rounded-2xl bg-ink-2 p-3">
      <div className="flex gap-4">
        <Link href={`/v/${v.id}`} className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-xl bg-ink-3" aria-label={t("studio.watch")}>
          {v.thumbUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={v.thumbUrl} alt="" className="size-full object-cover" />
          )}
        </Link>
        <div className="min-w-0 flex-1">
          {editing ? (
            <>
              <label htmlFor={`cap-${v.id}`} className="sr-only">{t("studio.captionLabel")}</label>
              <textarea
                id={`cap-${v.id}`} rows={4} value={caption} maxLength={500} onChange={(e) => setCaption(e.target.value)}
                className="input resize-none !py-2 text-sm" autoFocus
              />
              <p className="mt-1 text-right text-xs tabular-nums text-mist">{caption.length}/500</p>
              {error && <p role="alert" className="mt-1 text-sm text-red-400">{error}</p>}
              <div className="mt-2 flex gap-2">
                <button onClick={save} disabled={busy} className="btn btn-primary !min-h-[40px] !px-5 text-sm">{t("studio.save")}</button>
                <button onClick={() => { setEditing(false); setCaption(v.caption); setError(""); }} disabled={busy} className="btn btn-ghost !min-h-[40px] !px-5 text-sm">{t("studio.cancel")}</button>
              </div>
            </>
          ) : (
            <>
              <p className="line-clamp-2 text-[15px] font-semibold">{v.caption || <span className="text-mist">{t("studio.noCaption")}</span>}</p>
              <p className="mt-0.5 text-xs text-mist">{timeAgo(v.createdAt, locale, t("time.now"))}</p>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums text-white/85">
                <span className="flex items-center gap-1"><Eye className="size-4 text-mist" aria-hidden /> {compact(v.views, locale)}</span>
                <span className="flex items-center gap-1"><Heart className="size-4 text-mist" aria-hidden /> {compact(v.likes, locale)}</span>
                <span className="flex items-center gap-1"><MessageCircle className="size-4 text-mist" aria-hidden /> {compact(v.comments, locale)}</span>
              </p>
            </>
          )}
        </div>
        {!editing && (
          <div className="flex shrink-0 items-start gap-1">
            {confirm ? (
              <div className="flex flex-col gap-1">
                <button onClick={del} disabled={busy} className="btn !min-h-[40px] bg-red-500 !px-4 text-sm text-white hover:bg-red-600">{t("studio.delete")}</button>
                <button onClick={() => setConfirm(false)} className="btn btn-ghost !min-h-[40px] !px-4 text-sm">{t("studio.cancel")}</button>
              </div>
            ) : (
              <>
                <button onClick={() => setShowLink((o) => !o)} aria-label={t("studio.link")} aria-expanded={showLink} className="grid size-11 cursor-pointer place-items-center rounded-full text-mist transition hover:bg-white/10 hover:text-white"><Link2 className="size-5" aria-hidden /></button>
                <button onClick={() => setEditing(true)} aria-label={t("studio.edit")} className="grid size-11 cursor-pointer place-items-center rounded-full text-mist transition hover:bg-white/10 hover:text-white"><Pencil className="size-5" aria-hidden /></button>
                <button onClick={() => setConfirm(true)} aria-label={t("studio.deleteVideo")} className="grid size-11 cursor-pointer place-items-center rounded-full text-mist transition hover:bg-red-500/15 hover:text-red-400"><Trash2 className="size-5" aria-hidden /></button>
              </>
            )}
          </div>
        )}
      </div>
      {showLink && !editing && (
        <div className="mt-3 rounded-xl bg-ink-3 p-3">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => copy("link")} className="btn btn-ghost !min-h-[40px] text-sm">
              {copied === "link" ? <Check className="size-4 text-gold" aria-hidden /> : <Copy className="size-4" aria-hidden />} {copied === "link" ? t("studio.copied") : t("studio.copyLink")}
            </button>
            <button onClick={() => copy("embed")} className="btn btn-ghost !min-h-[40px] text-sm">
              {copied === "embed" ? <Check className="size-4 text-gold" aria-hidden /> : <Code2 className="size-4" aria-hidden />} {copied === "embed" ? t("studio.copied") : t("studio.copyEmbed")}
            </button>
          </div>
          <p className="mt-2 text-xs text-mist">{t("studio.linkHint")}</p>
        </div>
      )}
      {confirm && !editing && <p className="mt-2 text-sm text-red-300">{t("studio.deleteConfirm")}</p>}
    </li>
  );
}
