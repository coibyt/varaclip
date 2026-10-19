import nodemailer from "nodemailer";
import { createHmac, createHash, randomBytes, timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";

/**
 * Outgoing email (sign-up confirmation, password reset, marketing).
 * Configured with environment variables, never in the code:
 *   SMTP_HOST, SMTP_PORT (465 = SSL), SMTP_USER, SMTP_PASS, MAIL_FROM (optional)
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://varaclip.com").replace(/\/$/, "");
const SITE = process.env.NEXT_PUBLIC_SITE_NAME || "VaraClip";

export const mailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transport: nodemailer.Transporter | null = null;
function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 465;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      pool: true,
      maxConnections: 2,
    });
  }
  return transport;
}

export type MailInput = { to: string; subject: string; html: string; text: string; unsubscribeUrl?: string };

/** Sends one email. Returns an error text instead of throwing, so a mail problem never breaks a page. */
export async function sendMail(m: MailInput): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!mailConfigured()) return { ok: false, error: "SMTP is not configured" };
  try {
    await getTransport().sendMail({
      from: process.env.MAIL_FROM || `${SITE} <${process.env.SMTP_USER}>`,
      to: m.to,
      subject: m.subject,
      html: m.html,
      text: m.text,
      ...(m.unsubscribeUrl ? { headers: { "List-Unsubscribe": `<${m.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

// ── one-time tokens (email confirmation, password reset): only a hash is stored in the database
export const newToken = () => randomBytes(32).toString("hex");
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

// ── unsubscribe links: signed so nobody can unsubscribe someone else
const sign = (userId: string) => createHmac("sha256", process.env.AUTH_SECRET || "dev-only-secret").update(`unsub:${userId}`).digest("hex").slice(0, 32);
export const unsubscribeUrl = (userId: string) => `${SITE_URL}/unsubscribe?u=${encodeURIComponent(userId)}&t=${sign(userId)}`;
export function checkUnsubscribe(userId: string, t: string) {
  const a = Buffer.from(sign(userId));
  const b = Buffer.from(t);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── email layout
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function layout(opts: { title: string; bodyHtml: string; button?: { label: string; url: string }; footer?: string }) {
  const btn = opts.button
    ? `<p style="margin:28px 0"><a href="${opts.button.url}" style="background:#FF4D8D;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px;display:inline-block">${esc(opts.button.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;color:#1d1d27">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden" cellpadding="0" cellspacing="0">
<tr><td style="background:linear-gradient(135deg,#FF4D8D,#F5C26B);padding:20px 28px;font-size:22px;font-weight:800;color:#0B0B0F">${esc(SITE)}</td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.6">
<h1 style="margin:0 0 12px;font-size:20px">${esc(opts.title)}</h1>
${opts.bodyHtml}
${btn}
</td></tr>
<tr><td style="padding:16px 28px 24px;font-size:12px;color:#777;line-height:1.5">${opts.footer ?? ""}<br>${esc(SITE)} · <a href="${SITE_URL}" style="color:#777">${SITE_URL.replace(/^https?:\/\//, "")}</a></td></tr>
</table></td></tr></table></body></html>`;
}

/** Plain text from the admin's message -> safe HTML paragraphs. */
export const textToHtml = (t: string) => t.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
export const escapeHtml = esc;

// ── "confirm your email to finish signing up": the pending sign-up travels inside a signed link
export type PendingSignup = {
  email: string; passwordHash: string; displayName: string; handle: string; isSalon: boolean; salonName: string;
  city: string; phone: string; marketingEmail: boolean; marketingSms: boolean; locale: string;
};
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-only-secret");

export const signSignup = (p: PendingSignup) =>
  new SignJWT({ pending: p }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("24h").sign(key());

export async function readSignup(token: string): Promise<PendingSignup | null> {
  try {
    const { payload } = await jwtVerify(token, key());
    return (payload.pending as PendingSignup) ?? null;
  } catch {
    return null;
  }
}
