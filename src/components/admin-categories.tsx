"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wand2 } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";

type Item = { id: string; caption: string; thumbUrl: string; handle: string };

/** Admin: sort older videos into categories, automatically or one at a time. */
export function AdminCategories({ items, uncategorized, total }: { items: Item[]; uncategorized: number; total: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  async function auto() {
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "auto" }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: j.error ?? "Lỗi" });
    const parts = Object.entries(j.byCategory as Record<string, number>).map(([k, n]) => `${CATEGORIES.find((c) => c.slug === k)?.nameVi ?? k}: ${n}`);
    setMsg({ ok: true, text: `Đã gán ${j.assigned} video${parts.length ? ` (${parts.join(", ")})` : ""}. Còn ${j.left} video không đoán được, hãy chọn tay bên dưới.` });
    router.refresh();
  }

  async function set(videoId: string, category: string) {
    setSaving(videoId);
    const r = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set", videoId, category }) });
    setSaving(null);
    if (r.ok) router.refresh();
    else setMsg({ ok: false, text: (await r.json().catch(() => ({}))).error ?? "Lỗi" });
  }

  return (
    <div className="mt-3 space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-ink-2 p-4">
        <p className="min-w-0 flex-1 text-sm">
          <strong>{uncategorized}</strong> / {total} video chưa có danh mục. Bấm nút để tự động gán theo mô tả và hashtag của video (không đổi video đã có danh mục).
        </p>
        <button type="button" onClick={auto} disabled={busy || uncategorized === 0} className="btn btn-primary">
          {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Wand2 className="size-5" aria-hidden />} Tự động gán danh mục
        </button>
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>{msg.text}</p>}
      {items.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {items.map((v) => (
            <li key={v.id} className="flex items-center gap-3 rounded-2xl bg-ink-2 p-2">
              <a href={`/v/${v.id}`} target="_blank" rel="noreferrer" className="aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-lg bg-black">
                {v.thumbUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.thumbUrl} alt="" className="size-full object-cover" />
                )}
              </a>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-mist">@{v.handle}</p>
                <p className="line-clamp-2 text-sm">{v.caption || "(không có mô tả)"}</p>
              </div>
              <select
                aria-label="Danh mục" defaultValue="" disabled={saving === v.id} onChange={(e) => e.target.value && set(v.id, e.target.value)}
                className="input !w-36 shrink-0 !px-2 !py-2 text-sm"
              >
                <option value="" disabled>Chọn…</option>
                {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.nameVi}</option>)}
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
