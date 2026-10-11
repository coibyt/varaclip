"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { Avatar } from "./avatar";

type P = {
  displayName: string; bio: string; salonName: string; city: string; phone: string; bookingUrl: string;
  isSalon: boolean; hue: number; avatarUrl: string; handle: string;
};

export function SettingsForm({ p, welcome }: { p: P; welcome: boolean }) {
  const router = useRouter();
  const file = useRef<HTMLInputElement>(null);
  const [v, setV] = useState(p);
  const [avatarKey, setAvatarKey] = useState<string | undefined>();
  const [avatarPreview, setAvatarPreview] = useState(p.avatarUrl);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof P) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  async function pickAvatar(f?: File) {
    if (!f) return;
    setMsg(null);
    const r = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: f.type, size: f.size }) });
    const j = await r.json();
    if (!r.ok) return setMsg({ ok: false, text: j.error });
    const up = await fetch(j.target.url, { method: "PUT", headers: j.target.headers, body: f });
    if (!up.ok) return setMsg({ ok: false, text: "Không tải được ảnh đại diện." });
    setAvatarKey(j.key);
    setAvatarPreview(URL.createObjectURL(f));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { displayName, bio, salonName, city, phone, bookingUrl } = v;
    const r = await fetch("/api/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, bio, salonName, city, phone, bookingUrl, avatarKey }),
    });
    const j = await r.json();
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: "Đã lưu thay đổi." } : { ok: false, text: j.error ?? "Không lưu được." });
    if (r.ok) router.refresh();
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-xl px-4 pb-28 pt-8 lg:pb-12">
      <h1 className="text-2xl font-extrabold tracking-tight">{welcome ? "Hoàn thiện hồ sơ salon" : "Cài đặt hồ sơ"}</h1>
      {welcome && <p className="mt-1 text-mist">Thêm liên kết đặt lịch hoặc số điện thoại để nút “Đặt lịch” hiện ngay trên mỗi video của bạn.</p>}

      <div className="mt-6 flex items-center gap-4">
        <Avatar name={v.displayName} hue={v.hue} url={avatarPreview} size={80} />
        <button type="button" onClick={() => file.current?.click()} className="btn btn-ghost"><Camera className="size-5" aria-hidden /> Đổi ảnh</button>
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pickAvatar(e.target.files?.[0])} />
      </div>

      <div className="mt-6 space-y-4">
        <F label="Tên hiển thị" value={v.displayName} onChange={set("displayName")} required minLength={2} maxLength={50} />
        {v.isSalon && <F label="Tên salon" value={v.salonName} onChange={set("salonName")} maxLength={80} />}
        {v.isSalon && <F label="Thành phố" value={v.city} onChange={set("city")} maxLength={60} />}
        <div>
          <label htmlFor="bio" className="mb-1.5 block text-sm font-semibold">Giới thiệu</label>
          <textarea id="bio" rows={3} maxLength={200} value={v.bio} onChange={set("bio")} className="input resize-none" />
        </div>
        {v.isSalon && (
          <>
            <F label="Liên kết đặt lịch" value={v.bookingUrl} onChange={set("bookingUrl")} type="url" placeholder="https://salon-cua-ban.com/dat-lich" hint="Nút “Đặt lịch” trên video sẽ mở liên kết này." />
            <F label="Số điện thoại" value={v.phone} onChange={set("phone")} type="tel" autoComplete="tel" hint="Dùng cho nút “Gọi ngay” khi chưa có liên kết đặt lịch." />
          </>
        )}
      </div>

      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-4 rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>{msg.text}</p>}

      <button disabled={busy} className="btn btn-primary mt-6 w-full sm:w-auto sm:min-w-[160px]">
        {busy && <Loader2 className="size-5 animate-spin" aria-hidden />} Lưu thay đổi
      </button>
    </form>
  );
}

function F({ label, hint, ...p }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `s-${label}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{label}</label>
      <input id={id} {...p} className="input" />
      {hint && <p className="mt-1 text-xs text-mist">{hint}</p>}
    </div>
  );
}
