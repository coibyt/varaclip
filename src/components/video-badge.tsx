"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useT } from "./locale-provider";
import type { Badge, BadgeMode } from "@/lib/util";

/** "🔥 Hot" / "New" label shown on a video. */
export function BadgeChip({ badge, className = "" }: { badge: Badge; className?: string }) {
  const t = useT();
  if (!badge) return null;
  return badge === "hot" ? (
    <span className={`inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-orange-500 to-red-600 px-1.5 py-0.5 text-[11px] font-extrabold uppercase text-white shadow ${className}`}>🔥 {t("badge.hot")}</span>
  ) : (
    <span className={`inline-flex items-center rounded-md bg-gradient-to-r from-emerald-400 to-teal-500 px-1.5 py-0.5 text-[11px] font-extrabold uppercase text-ink shadow ${className}`}>{t("badge.new")}</span>
  );
}

const OPTIONS: { mode: BadgeMode; label: string }[] = [
  { mode: "auto", label: "Tự động" },
  { mode: "hot", label: "🔥 Đang hot" },
  { mode: "new", label: "Mới" },
  { mode: "none", label: "Ẩn huy hiệu" },
];

/** Admin only: choose the badge of a video by hand (or leave it to the automatic rules). */
export function AdminBadgeControl({ videoId, mode, onChange, className = "" }: { videoId: string; mode: BadgeMode; onChange: (badge: Badge, mode: BadgeMode) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pick(next: BadgeMode) {
    setBusy(true);
    const r = await fetch(`/api/videos/${videoId}/badge`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ badge: next }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) { onChange(j.badge ?? null, next); setOpen(false); }
  }

  return (
    <div className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Huy hiệu (admin)" aria-expanded={open} className="grid size-10 place-items-center rounded-full bg-black/40 backdrop-blur transition hover:bg-black/60">
        {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <ShieldCheck className="size-5 text-gold" aria-hidden />}
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-12 z-40 w-44 overflow-hidden rounded-xl border border-white/10 bg-ink-2 py-1 text-sm shadow-xl">
          <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-mist">Huy hiệu</p>
          {OPTIONS.map((o) => (
            <button key={o.mode} type="button" role="menuitemradio" aria-checked={mode === o.mode} onClick={() => pick(o.mode)} className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-white/5 ${mode === o.mode ? "font-bold text-glow" : ""}`}>
              {o.label} {mode === o.mode && <span aria-hidden>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
