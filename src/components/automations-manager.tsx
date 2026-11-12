"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Play, Send, Store, UserRound } from "lucide-react";

type Auto = {
  key: string; audience: "customer" | "salon"; name: string; when: string; enabled: boolean;
  subject: string; body: string; buttonLabel: string; delayDays: number; sent30: number; dueNow: number;
};
type Data = {
  mailConfigured: boolean; lastRun: string | null; automations: Auto[];
  recent: { id: string; automation: string; email: string; status: string; error: string; sentAt: string }[];
};

const fmt = (iso: string) => new Date(iso).toLocaleString("vi-VN", { timeZone: "Europe/Helsinki", dateStyle: "short", timeStyle: "short" });
const call = (body: object) => fetch("/api/admin/automations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** Admin: switch automatic emails on/off, reword them, send a test, run them now, see what was sent. */
export function AutomationsManager() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/automations", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { setData(j); setError(""); } else setError(j.error ?? "Lỗi");
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function runNow() {
    setRunning(true);
    setNote(null);
    const r = await call({ action: "run" });
    const j = await r.json().catch(() => ({}));
    setRunning(false);
    setNote(r.ok ? { ok: true, text: `Đã gửi ${j.sent} email${j.failed ? `, lỗi ${j.failed}` : ""}${j.capped ? ". Còn email chưa gửi, hệ thống sẽ gửi tiếp ở lượt sau (mỗi giờ)." : "."}` } : { ok: false, text: j.error ?? "Lỗi" });
    void load();
  }

  if (error) {
    return <div className="mt-6 rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm leading-relaxed">{error}</div>;
  }
  if (!data) return <p className="mt-6 flex items-center gap-2 text-mist"><Loader2 className="size-5 animate-spin" aria-hidden /> Đang tải…</p>;

  const names = new Map(data.automations.map((a) => [a.key, a.name]));
  return (
    <div className="mt-6 space-y-6">
      {!data.mailConfigured && <p className="rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm">Chưa cấu hình gửi email (SMTP_HOST, SMTP_USER, SMTP_PASS) trong Hostinger nên email tự động chưa chạy.</p>}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-ink-2 p-4">
        <div className="min-w-0 flex-1 text-sm leading-relaxed">
          <p>Hệ thống tự kiểm tra và gửi <strong>mỗi giờ một lần</strong> (tối đa 60 email mỗi lượt), chỉ gửi cho người đã đồng ý nhận email khi đăng ký. Mỗi email có link hủy nhận.</p>
          <p className="mt-1 text-mist">Lần chạy gần nhất: {data.lastRun ? fmt(data.lastRun) : "chưa chạy"}</p>
        </div>
        <button type="button" onClick={runNow} disabled={running || !data.mailConfigured} className="btn btn-primary">
          {running ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Play className="size-5" aria-hidden />} Chạy ngay
        </button>
      </div>
      {note && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${note.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>{note.text}</p>}

      {(["customer", "salon"] as const).map((aud) => (
        <section key={aud}>
          <h2 className="flex items-center gap-2 text-lg font-bold">{aud === "customer" ? <UserRound className="size-5 text-gold" aria-hidden /> : <Store className="size-5 text-gold" aria-hidden />} {aud === "customer" ? "Chăm sóc khách hàng" : "Chăm sóc chủ salon"}</h2>
          <div className="mt-3 space-y-3">
            {data.automations.filter((a) => a.audience === aud).map((a) => <AutomationCard key={a.key} a={a} onSaved={load} />)}
          </div>
        </section>
      ))}

      <section>
        <h2 className="text-lg font-bold">Email đã gửi gần đây</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl bg-ink-2">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs uppercase text-mist"><tr><th className="p-3">Thời gian</th><th className="p-3">Email tự động</th><th className="p-3">Người nhận</th><th className="p-3">Trạng thái</th></tr></thead>
            <tbody>
              {data.recent.length === 0 && <tr><td colSpan={4} className="p-4 text-mist">Chưa gửi email nào.</td></tr>}
              {data.recent.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="whitespace-nowrap p-3 tabular-nums text-xs text-mist">{fmt(r.sentAt)}</td>
                  <td className="p-3">{names.get(r.automation) ?? r.automation}</td>
                  <td className="break-all p-3">{r.email}</td>
                  <td className="p-3">{r.status === "sent" ? <span className="text-emerald-300">Đã gửi</span> : r.status === "failed" ? <span className="text-red-300" title={r.error}>Lỗi</span> : <span className="text-mist">Đang gửi</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AutomationCard({ a, onSaved }: { a: Auto; onSaved: () => void }) {
  const [v, setV] = useState(a);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"" | "save" | "toggle" | "test">("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(next: Auto, kind: "save" | "toggle") {
    setBusy(kind);
    setMsg(null);
    const r = await call({ action: "save", key: a.key, enabled: next.enabled, subject: next.subject, body: next.body, buttonLabel: next.buttonLabel, delayDays: next.delayDays });
    const j = await r.json().catch(() => ({}));
    setBusy("");
    if (r.ok) { setV(next); setMsg({ ok: true, text: kind === "toggle" ? (next.enabled ? "Đã bật" : "Đã tắt") : "Đã lưu" }); onSaved(); }
    else setMsg({ ok: false, text: j.error ?? "Lỗi" });
  }

  async function test() {
    setBusy("test");
    setMsg(null);
    await save(v, "save");
    const r = await call({ action: "test", key: a.key });
    const j = await r.json().catch(() => ({}));
    setBusy("");
    setMsg(r.ok ? { ok: true, text: `Đã gửi email thử đến ${j.to}` } : { ok: false, text: j.error ?? "Lỗi" });
  }

  const set = (k: keyof Auto) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: k === "delayDays" ? Number(e.target.value) : e.target.value });

  return (
    <div className={`rounded-2xl border p-4 ${v.enabled ? "border-glow/40 bg-glow/5" : "border-white/10 bg-ink-2"}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold">{a.name}</p>
          <p className="mt-0.5 text-sm text-mist">{a.when.replace("{delay}", String(v.delayDays))}</p>
          <p className="mt-1 text-xs text-mist">Đã gửi 30 ngày qua: <strong className="text-white">{a.sent30}</strong> · Đang chờ gửi: <strong className="text-white">{a.dueNow}</strong></p>
        </div>
        <button
          type="button" role="switch" aria-checked={v.enabled} aria-label={`Bật/tắt: ${a.name}`} disabled={busy !== ""} onClick={() => save({ ...v, enabled: !v.enabled }, "toggle")}
          className={`relative h-8 w-14 shrink-0 rounded-full transition ${v.enabled ? "bg-glow" : "bg-white/20"} disabled:opacity-60`}
        >
          {busy === "toggle" ? <Loader2 className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 animate-spin" aria-hidden /> : <span className={`absolute top-1 size-6 rounded-full bg-white transition-all ${v.enabled ? "left-7" : "left-1"}`} />}
        </button>
      </div>

      <button type="button" onClick={() => setOpen((o) => !o)} className="mt-2 text-sm font-semibold text-glow hover:underline">{open ? "Thu gọn" : "Sửa nội dung email"}</button>

      {open && (
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor={`s-${a.key}`} className="mb-1 block text-sm font-semibold">Tiêu đề</label>
            <input id={`s-${a.key}`} value={v.subject} onChange={set("subject")} maxLength={150} className="input" />
          </div>
          <div>
            <label htmlFor={`b-${a.key}`} className="mb-1 block text-sm font-semibold">Nội dung</label>
            <textarea id={`b-${a.key}`} rows={6} value={v.body} onChange={set("body")} maxLength={5000} className="input" />
            <p className="mt-1 text-xs text-mist">Dùng {"{name}"} = tên người nhận, {"{salon}"} = tên salon, {"{count}"} = số video mới, {"{days}"} = số ngày. Cách một dòng trống để xuống đoạn.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`l-${a.key}`} className="mb-1 block text-sm font-semibold">Chữ trên nút</label>
              <input id={`l-${a.key}`} value={v.buttonLabel} onChange={set("buttonLabel")} maxLength={40} className="input" />
            </div>
            <div>
              <label htmlFor={`d-${a.key}`} className="mb-1 block text-sm font-semibold">Số ngày</label>
              <input id={`d-${a.key}`} type="number" min={1} max={365} value={v.delayDays} onChange={set("delayDays")} className="input" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => save(v, "save")} disabled={busy !== ""} className="btn btn-primary">{busy === "save" && <Loader2 className="size-5 animate-spin" aria-hidden />} Lưu</button>
            <button type="button" onClick={test} disabled={busy !== ""} className="btn btn-ghost">{busy === "test" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Send className="size-5" aria-hidden />} Gửi thử cho tôi</button>
          </div>
        </div>
      )}
      {msg && <p role="status" className={`mt-2 text-sm ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</p>}
    </div>
  );
}
