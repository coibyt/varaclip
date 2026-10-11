"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Scissors, User } from "lucide-react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") && sp.get("next")!.startsWith("/") ? sp.get("next")! : "/";
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
    if (reg) body.isSalon = isSalon;
    const r = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) {
      setBusy(false);
      return setError(j.error ?? "Có lỗi xảy ra, vui lòng thử lại.");
    }
    router.push(reg && isSalon ? "/settings?welcome=1" : next);
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10 pb-24 lg:pb-10">
      <h1 className="font-display text-4xl font-bold tracking-tight">{reg ? "Tạo tài khoản" : "Chào mừng quay lại"}</h1>
      <p className="mt-2 text-mist">{reg ? "Xem video làm đẹp, hoặc đăng video cho salon của bạn." : "Đăng nhập để thích, bình luận và theo dõi salon."}</p>

      {reg && (
        <div className="mt-6 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Loại tài khoản">
          {[
            { v: false, label: "Người xem", sub: "Xem & tương tác", icon: User },
            { v: true, label: "Chủ salon", sub: "Đăng video", icon: Scissors },
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
            <Field label="Tên hiển thị" name="displayName" autoComplete="name" required minLength={2} />
            <Field label="Tên người dùng" name="handle" autoComplete="username" required hint="Chữ thường, số, _ hoặc dấu chấm (3–24 ký tự)" pattern="[a-zA-Z0-9_.]{3,24}" />
            {isSalon && (
              <>
                <Field label="Tên salon" name="salonName" required />
                <Field label="Thành phố" name="city" autoComplete="address-level2" />
              </>
            )}
          </>
        )}
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Mật khẩu" name="password" type="password" autoComplete={reg ? "new-password" : "current-password"} required minLength={reg ? 8 : 1} hint={reg ? "Tối thiểu 8 ký tự" : undefined} />

        {error && <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

        <button disabled={busy} className="btn btn-primary w-full">
          {busy && <Loader2 className="size-5 animate-spin" aria-hidden />} {reg ? "Tạo tài khoản" : "Đăng nhập"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-mist">
        {reg ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
        <Link href={reg ? "/login" : "/register"} className="font-bold text-glow hover:underline">{reg ? "Đăng nhập" : "Đăng ký"}</Link>
      </p>
    </div>
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
