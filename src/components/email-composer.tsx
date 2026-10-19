"use client";

import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";

type Info = { recipients: number | null; configured: boolean };

/** Admin: write a marketing email, send a test to yourself, then send it to everyone who agreed to receive it. */
export function EmailComposer() {
  const [info, setInfo] = useState<Info | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/email").then((r) => r.json()).then(setInfo).catch(() => {});
  }, []);

  async function call(mode: "test" | "all", offset = 0) {
    const r = await fetch("/api/admin/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, body, mode, offset }) });
    return { ok: r.ok, data: await r.json().catch(() => ({})) };
  }

  async function test() {
    setBusy(true);
    setLog(null);
    const r = await call("test");
    setBusy(false);
    setLog(r.ok ? { ok: true, text: `Đã gửi email thử đến ${r.data.to}. Hãy kiểm tra hộp thư (và thư rác).` } : { ok: false, text: r.data.error ?? "Gửi thất bại" });
  }

  async function sendAll() {
    if (!info?.recipients) return;
    if (!window.confirm(`Gửi email này cho ${info.recipients} khách đã đồng ý nhận tin? Không thể hủy sau khi bắt đầu.`)) return;
    setBusy(true);
    let offset = 0, sent = 0, failed = 0;
    const errors: string[] = [];
    for (;;) {
      setLog({ ok: true, text: `Đang gửi… đã gửi ${sent}${failed ? `, lỗi ${failed}` : ""} / ${info.recipients}` });
      const r = await call("all", offset);
      if (!r.ok) { errors.push(r.data.error ?? "Lỗi"); break; }
      sent += r.data.sent;
      failed += r.data.failed;
      errors.push(...(r.data.errors ?? []));
      if (r.data.done || (r.data.sent === 0 && r.data.failed > 0)) break;
      offset = r.data.nextOffset;
    }
    setBusy(false);
    setLog({ ok: failed === 0 && errors.length === 0, text: `Xong: đã gửi ${sent}, lỗi ${failed}.${errors.length ? ` ${errors.slice(0, 3).join(" · ")}` : ""}` });
  }

  const ready = subject.trim().length >= 3 && body.trim().length >= 5;
  return (
    <div className="mt-6 space-y-4">
      {info && !info.configured && <p className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">Chưa cấu hình gửi email. Thêm SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS trong Hostinger rồi deploy lại.</p>}
      <p className="text-sm text-mist">Người nhận: <strong className="text-white">{info?.recipients ?? "…"}</strong> khách đã chọn nhận email tiếp thị khi đăng ký. Mỗi email có sẵn liên kết hủy đăng ký.</p>
      <div>
        <label htmlFor="em-sub" className="mb-1.5 block text-sm font-semibold">Tiêu đề</label>
        <input id="em-sub" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} className="input" />
      </div>
      <div>
        <label htmlFor="em-body" className="mb-1.5 block text-sm font-semibold">Nội dung</label>
        <textarea id="em-body" rows={10} value={body} onChange={(e) => setBody(e.target.value)} maxLength={8000} className="input" placeholder="Viết nội dung. Cách một dòng trống để xuống đoạn mới." />
      </div>
      {log && <p role={log.ok ? "status" : "alert"} className={`rounded-xl px-4 py-3 text-sm ${log.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>{log.text}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={test} disabled={busy || !ready} className="btn btn-ghost">{busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Send className="size-5" aria-hidden />} Gửi thử cho tôi</button>
        <button type="button" onClick={sendAll} disabled={busy || !ready || !info?.recipients} className="btn btn-primary">Gửi cho tất cả</button>
      </div>
    </div>
  );
}
