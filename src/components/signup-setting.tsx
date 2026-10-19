"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

/** Admin switch: when on, a new account is only created after the person clicks the link emailed to them. */
export function SignupSetting({ initial, mailConfigured }: { initial: boolean; mailConfigured: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    const r = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requireEmailVerify: !on }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) setOn(!on);
    else setError(j.error ?? "Không lưu được cài đặt");
  }

  return (
    <div className="rounded-2xl bg-ink-2 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold">Bắt buộc xác nhận email khi đăng ký</p>
          <p className="mt-1 text-sm text-mist">
            {on
              ? "Đang BẬT: khách đăng ký xong phải bấm liên kết trong email thì tài khoản mới được tạo."
              : "Đang TẮT: tài khoản được tạo ngay khi đăng ký (khách vẫn nhận email chào mừng)."}
          </p>
        </div>
        <button
          type="button" role="switch" aria-checked={on} aria-label="Bắt buộc xác nhận email khi đăng ký" onClick={toggle} disabled={busy || (!on && !mailConfigured)}
          className={`relative h-8 w-14 shrink-0 rounded-full transition ${on ? "bg-glow" : "bg-white/20"} disabled:opacity-50`}
        >
          {busy ? <Loader2 className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 animate-spin" aria-hidden /> : <span className={`absolute top-1 size-6 rounded-full bg-white transition-all ${on ? "left-7" : "left-1"}`} />}
        </button>
      </div>
      {!mailConfigured && <p className="mt-3 text-sm text-gold">Chưa cấu hình gửi email (SMTP) trong Hostinger nên chưa bật được.</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    </div>
  );
}
