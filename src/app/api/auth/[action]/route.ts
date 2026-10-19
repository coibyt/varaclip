import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkPassword, createSession, destroySession, getUser, hashPassword, stashCurrentSession, switchAccount } from "@/lib/auth";
import { HANDLE_RE } from "@/lib/util";
import { getLocale, getT } from "@/lib/i18n-server";
import { SITE_URL, hashToken, mailConfigured, newToken, readSignup, sendMail, signSignup } from "@/lib/mail";
import { confirmSignupMail, passwordChangedMail, resetMail, welcomeMail } from "@/lib/mails";
import { getFlag } from "@/lib/settings";

const registerSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(100),
  displayName: z.string().trim().min(2).max(50),
  handle: z.string().trim().toLowerCase().regex(HANDLE_RE),
  isSalon: z.boolean().default(false),
  salonName: z.string().trim().max(80).default(""),
  city: z.string().trim().max(60).default(""),
  phone: z.string().trim().max(30).default(""),
  marketingEmail: z.boolean().default(false),
  marketingSms: z.boolean().default(false),
  add: z.boolean().default(false),
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1), add: z.boolean().default(false) });
const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ token: z.string().min(20).max(100), password: z.string().min(8).max(100) });
const passwordSchema = z.object({ current: z.string().min(1), next: z.string().min(8).max(100) });

const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const { t } = await getT();

  if (action === "logout") {
    await destroySession();
    return NextResponse.json({ ok: true });
  }

  const body = await req.json().catch(() => null);

  if (action === "stash") {
    await stashCurrentSession();
    return NextResponse.json({ ok: true });
  }

  if (action === "switch") {
    const id = typeof body?.id === "string" ? body.id : "";
    return (await switchAccount(id)) ? NextResponse.json({ ok: true }) : err(t("err.invalid"), 404);
  }

  if (action === "confirm") {
    const pending = typeof body?.token === "string" ? await readSignup(body.token) : null;
    if (!pending) return err(t("auth.confirmBad"), 400);
    if (await db.user.findUnique({ where: { email: pending.email } })) return err(t("err.emailTaken"), 409);
    if (await db.user.findUnique({ where: { handle: pending.handle } })) return err(t("err.handleTaken"), 409);
    const user = await db.user.create({
      data: {
        email: pending.email, passwordHash: pending.passwordHash, displayName: pending.displayName, handle: pending.handle,
        isSalon: pending.isSalon, salonName: pending.salonName, city: pending.city, phone: pending.phone, hue: Math.floor(Math.random() * 360),
      },
    });
    await db.userConsent.create({ data: { userId: user.id, marketingEmail: pending.marketingEmail, marketingSms: pending.marketingSms } }).catch(() => {});
    await sendMail(welcomeMail(user.email, user.displayName, pending.locale, undefined, pending.isSalon)).catch(() => {});
    await createSession(user.id);
    return NextResponse.json({ ok: true, handle: user.handle, isSalon: user.isSalon });
  }

  if (action === "forgot") {
    const p = forgotSchema.safeParse(body);
    if (!p.success) return err(t("err.email"));
    const user = await db.user.findUnique({ where: { email: p.data.email.toLowerCase() } });
    // Same answer whether or not the address has an account, so nobody can probe who is registered.
    if (user) {
      try {
        const recent = await db.emailToken.findFirst({ where: { userId: user.id, type: "reset", createdAt: { gt: new Date(Date.now() - 60_000) } }, select: { id: true } });
        if (!recent) {
          const token = newToken();
          await db.emailToken.create({ data: { userId: user.id, type: "reset", tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600_000) } });
          await sendMail(resetMail(user.email, await getLocale(), `${SITE_URL}/reset-password?token=${token}`, user.displayName));
        }
      } catch { /* the page answers the same way */ }
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "reset") {
    const p = resetSchema.safeParse(body);
    if (!p.success) return err(t("auth.resetBad"));
    const row = await db.emailToken.findFirst({ where: { tokenHash: hashToken(p.data.token), type: "reset", usedAt: null, expiresAt: { gt: new Date() } } }).catch(() => null);
    if (!row) return err(t("auth.resetBad"), 400);
    await db.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(p.data.password) } });
    await db.emailToken.updateMany({ where: { userId: row.userId, type: "reset", usedAt: null }, data: { usedAt: new Date() } });
    const owner = await db.user.findUnique({ where: { id: row.userId }, select: { email: true, displayName: true } });
    if (owner) await sendMail(passwordChangedMail(owner.email, await getLocale(), owner.displayName));
    return NextResponse.json({ ok: true });
  }

  if (action === "password") {
    const me = await getUser();
    if (!me) return err(t("err.login"), 401);
    const p = passwordSchema.safeParse(body);
    if (!p.success) return err(t("err.password"));
    if (!(await checkPassword(p.data.current, me.passwordHash))) return err(t("acc.pwWrong"), 403);
    await db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(p.data.next) } });
    await sendMail(passwordChangedMail(me.email, await getLocale(), me.displayName));
    return NextResponse.json({ ok: true });
  }

  if (action === "register") {
    const p = registerSchema.safeParse(body);
    if (!p.success) {
      const bad = p.error.issues[0]?.path[0];
      const msg: Record<string, string> = {
        email: t("err.email"),
        password: t("err.password"),
        displayName: t("err.displayName"),
        handle: t("err.handle"),
      };
      return err(msg[String(bad)] ?? t("err.invalid"));
    }
    const d = p.data;
    if (d.isSalon && !d.salonName) return err(t("err.salonName"));
    const email = d.email.toLowerCase();
    if (await db.user.findUnique({ where: { email } })) return err(t("err.emailTaken"), 409);
    if (await db.user.findUnique({ where: { handle: d.handle } })) return err(t("err.handleTaken"), 409);
    // Admin switch: the account is only created after the person clicks the link we email them.
    if (mailConfigured() && (await getFlag("requireEmailVerify"))) {
      const token = await signSignup({
        email, passwordHash: await hashPassword(d.password), displayName: d.displayName, handle: d.handle, isSalon: d.isSalon,
        salonName: d.salonName, city: d.city, phone: d.phone, marketingEmail: d.marketingEmail, marketingSms: d.marketingSms, locale: await getLocale(),
      });
      const sent = await sendMail(confirmSignupMail(email, d.displayName, await getLocale(), `${SITE_URL}/confirm-signup?token=${token}`));
      if (!sent.ok) return err(t("auth.genericError"), 502);
      return NextResponse.json({ ok: true, pending: true, email });
    }
    const user = await db.user.create({
      data: {
        email, passwordHash: await hashPassword(d.password), displayName: d.displayName, handle: d.handle,
        isSalon: d.isSalon, salonName: d.salonName, city: d.city, phone: d.phone, hue: Math.floor(Math.random() * 360),
      },
    });
    // Remember what they agreed to; a missing table must never block sign-up.
    await db.userConsent.create({ data: { userId: user.id, marketingEmail: d.marketingEmail, marketingSms: d.marketingSms } }).catch(() => {});
    // Welcome email with a link to confirm the address; a mail or database problem must never block sign-up.
    try {
      let verifyUrl: string | undefined;
      try {
        const token = newToken();
        await db.emailToken.create({ data: { userId: user.id, type: "verify", tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 7 * 24 * 3600_000) } });
        verifyUrl = `${SITE_URL}/verify?token=${token}`;
      } catch { /* table not created yet: send the welcome email without the link */ }
      await sendMail(welcomeMail(user.email, user.displayName, await getLocale(), verifyUrl, d.isSalon));
    } catch { /* ignore */ }
    await createSession(user.id, d.add);
    return NextResponse.json({ ok: true, handle: user.handle });
  }

  if (action === "login") {
    const p = loginSchema.safeParse(body);
    if (!p.success) return err(t("err.loginFields"));
    const user = await db.user.findUnique({ where: { email: p.data.email.toLowerCase() } });
    // Same message for unknown email and wrong password, to avoid account enumeration.
    if (!user || !(await checkPassword(p.data.password, user.passwordHash))) return err(t("err.badCreds"), 401);
    await createSession(user.id, p.data.add);
    return NextResponse.json({ ok: true, handle: user.handle });
  }

  return err("Not found", 404);
}
