import { escapeHtml as e, SITE_URL } from "./mail";

/**
 * The VaraClip email design: a dark branded header, a warm white card with a personal greeting,
 * one clear button, optional feature cards and a note, and a footer with company details.
 * Tables and inline styles only, so it looks the same in Gmail, Apple Mail and Outlook.
 */
const C = { ink: "#0B0B0F", ink2: "#14141B", glow: "#FF4D8D", gold: "#F5C26B", page: "#F3EEEA", text: "#1D1D27", muted: "#6B6B7B", line: "#EAE4DF", soft: "#FBF8F6" };
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

type Lang = "vi" | "en";
const F = {
  vi: {
    tagline: "Video làm đẹp từ các salon, ngay trong tầm tay bạn.",
    explore: "Khám phá", live: "Livestream", terms: "Điều khoản", privacy: "Bảo mật",
    sentTo: (to: string) => `Email này được gửi đến ${to}.`,
    help: "Cần trợ giúp? Chỉ cần trả lời email này, chúng tôi luôn sẵn lòng.",
    copy: "Nếu nút không bấm được, hãy sao chép liên kết này vào trình duyệt:",
    company: "Moja Investors Oy · Mã số doanh nghiệp 3555331-8 · Hakaniemen torikatu 2 L 48, 00530 Helsinki, Phần Lan",
    unsub: "Hủy nhận email tiếp thị",
  },
  en: {
    tagline: "Beauty videos from salons, right at your fingertips.",
    explore: "Explore", live: "Live", terms: "Terms", privacy: "Privacy",
    sentTo: (to: string) => `This email was sent to ${to}.`,
    help: "Need help? Just reply to this email, we are always happy to hear from you.",
    copy: "If the button does not work, copy this link into your browser:",
    company: "Moja Investors Oy · Business ID 3555331-8 · Hakaniemen torikatu 2 L 48, 00530 Helsinki, Finland",
    unsub: "Unsubscribe from marketing emails",
  },
} as const;

export type ShellOpts = {
  locale: string;
  to: string;
  /** The grey line shown next to the subject in the inbox list. */
  preheader: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  greeting?: string;
  /** Already-escaped HTML paragraphs. */
  bodyHtml: string;
  button?: { label: string; url: string };
  cards?: { icon: string; title: string; text: string }[];
  note?: { title: string; text: string };
  /** Why the person receives this email (one sentence). */
  reason?: string;
  unsubscribe?: string;
};

export const para = (s: string) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${C.text}">${e(s)}</p>`;

export function emailShell(o: ShellOpts): string {
  const t = F[o.locale === "vi" ? "vi" : "en" as Lang];
  const host = SITE_URL.replace(/^https?:\/\//, "");
  // Georgia has no full Vietnamese support, so Vietnamese emails use the sans-serif for headings.
  const H = o.locale === "vi" ? SANS : SERIF;

  const button = o.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px"><tr><td style="border-radius:14px;background:${C.glow}">
        <a href="${o.button.url}" style="display:inline-block;padding:16px 34px;font-family:${SANS};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:14px;background:linear-gradient(135deg,${C.glow},#FF7A6B)">${e(o.button.label)}</a>
      </td></tr></table>
      <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:${C.muted}">${e(t.copy)}<br><a href="${o.button.url}" style="color:${C.muted};word-break:break-all">${e(o.button.url)}</a></p>`
    : "";

  const cards = (o.cards ?? [])
    .map(
      (c) => `<tr><td style="padding:0 0 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.soft};border:1px solid ${C.line};border-radius:14px"><tr>
        <td width="64" valign="top" style="padding:16px 0 16px 16px"><div style="width:44px;height:44px;border-radius:12px;background:#FFE9F1;text-align:center;line-height:44px;font-size:22px">${c.icon}</div></td>
        <td valign="top" style="padding:16px 18px 16px 6px"><p style="margin:0 0 3px;font-size:15px;font-weight:700;color:${C.text}">${e(c.title)}</p><p style="margin:0;font-size:14px;line-height:1.55;color:${C.muted}">${e(c.text)}</p></td>
      </tr></table></td></tr>`,
    )
    .join("");

  const note = o.note
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 0"><tr><td style="background:${C.soft};border-left:4px solid ${C.gold};border-radius:10px;padding:14px 18px">
        <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:${C.text}">${e(o.note.title)}</p><p style="margin:0;font-size:13px;line-height:1.6;color:${C.muted}">${e(o.note.text)}</p>
      </td></tr></table>`
    : "";

  const unsub = o.unsubscribe ? `<br><a href="${o.unsubscribe}" style="color:${C.muted};text-decoration:underline">${e(t.unsub)}</a>` : "";

  return `<!doctype html>
<html lang="${o.locale === "vi" ? "vi" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${e(o.title)}</title></head>
<body style="margin:0;padding:0;background:${C.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${e(o.preheader)}${"&nbsp;&zwnj;".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">

  <tr><td style="background:${C.ink};border-radius:24px 24px 0 0;padding:0">
    <div style="height:5px;background:linear-gradient(90deg,${C.glow},${C.gold});border-radius:24px 24px 0 0;line-height:5px;font-size:0">&nbsp;</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:30px 36px 8px">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:44px;height:44px;border-radius:12px;background:${C.glow};background:linear-gradient(135deg,${C.glow},${C.gold});text-align:center;font-family:${H};font-size:26px;font-weight:700;color:${C.ink}" width="44" height="44">V</td>
        <td style="padding-left:12px;font-family:${H};font-size:26px;font-weight:700;letter-spacing:-0.5px;color:#ffffff">VaraClip</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:22px 36px 40px">
      ${o.eyebrow ? `<p style="margin:0 0 10px;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.gold}">${e(o.eyebrow)}</p>` : ""}
      <h1 style="margin:0;font-family:${H};font-size:32px;line-height:1.2;font-weight:700;color:#ffffff">${e(o.title)}</h1>
      ${o.subtitle ? `<p style="margin:14px 0 0;font-family:${SANS};font-size:16px;line-height:1.6;color:#C9C9D6">${e(o.subtitle)}</p>` : ""}
    </td></tr></table>
  </td></tr>

  <tr><td style="background:#ffffff;padding:36px 36px 32px;font-family:${SANS}">
    ${o.greeting ? `<p style="margin:0 0 16px;font-size:18px;font-weight:700;color:${C.text}">${e(o.greeting)}</p>` : ""}
    ${o.bodyHtml}
    ${button}
    ${cards ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0 0">${cards}</table>` : ""}
    ${note}
  </td></tr>

  <tr><td style="background:#ffffff;border-radius:0 0 24px 24px;padding:0 36px 30px;font-family:${SANS}">
    <div style="border-top:1px solid ${C.line};padding-top:20px;font-size:14px;line-height:1.6;color:${C.muted}">${e(t.help)}</div>
  </td></tr>

  <tr><td align="center" style="padding:26px 20px 8px;font-family:${SANS}">
    <p style="margin:0 0 12px;font-family:${H};font-size:15px;font-style:italic;color:${C.text}">${e(t.tagline)}</p>
    <p style="margin:0 0 14px;font-size:13px;color:${C.muted}">
      <a href="${SITE_URL}" style="color:${C.text};text-decoration:none;font-weight:600">${e(t.explore)}</a> &nbsp;·&nbsp;
      <a href="${SITE_URL}/live" style="color:${C.text};text-decoration:none;font-weight:600">${e(t.live)}</a> &nbsp;·&nbsp;
      <a href="${SITE_URL}/terms" style="color:${C.text};text-decoration:none;font-weight:600">${e(t.terms)}</a> &nbsp;·&nbsp;
      <a href="${SITE_URL}/privacy" style="color:${C.text};text-decoration:none;font-weight:600">${e(t.privacy)}</a>
    </p>
    <p style="margin:0;font-size:12px;line-height:1.7;color:${C.muted}">${e(t.sentTo(o.to))}${o.reason ? ` ${e(o.reason)}` : ""}${unsub}</p>
    <p style="margin:10px 0 0;font-size:11px;line-height:1.6;color:#9A9AA8">${e(t.company)}<br><a href="${SITE_URL}" style="color:#9A9AA8">${host}</a></p>
  </td></tr>

</table></td></tr></table></body></html>`;
}
