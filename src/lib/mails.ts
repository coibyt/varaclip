import { escapeHtml, layout, SITE_URL, type MailInput } from "./mail";

/** Service emails. Vietnamese for Vietnamese visitors, English for everyone else. */
type Lang = "vi" | "en";
const lang = (locale: string): Lang => (locale === "vi" ? "vi" : "en");

const T = {
  vi: {
    welcomeSubject: "Chào mừng bạn đến với VaraClip",
    welcomeTitle: (n: string) => `Chào ${n}, chào mừng bạn đến với VaraClip!`,
    welcomeBody: "Tài khoản của bạn đã được tạo. Hãy xác nhận địa chỉ email để chúng tôi có thể giúp bạn lấy lại mật khẩu khi cần.",
    welcomeBtn: "Xác nhận email",
    welcomeNoBtn: "Bạn có thể bắt đầu xem video, theo dõi các salon và đặt lịch ngay bây giờ.",
    welcomeIgnore: "Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email này.",
    confirmSubject: "Xác nhận email để hoàn tất đăng ký VaraClip",
    confirmTitle: (n: string) => `Chào ${n}, chỉ còn một bước nữa!`,
    confirmBody: "Bấm nút bên dưới để xác nhận địa chỉ email và hoàn tất việc tạo tài khoản VaraClip. Liên kết có hiệu lực trong 24 giờ.",
    confirmBtn: "Hoàn tất đăng ký",
    resetSubject: "Đặt lại mật khẩu VaraClip",
    resetTitle: "Đặt lại mật khẩu",
    resetBody: "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Bấm nút bên dưới để chọn mật khẩu mới. Liên kết có hiệu lực trong 1 giờ.",
    resetBtn: "Chọn mật khẩu mới",
    resetIgnore: "Nếu bạn không yêu cầu, hãy bỏ qua email này, mật khẩu của bạn vẫn an toàn.",
    unsub: "Hủy nhận email tiếp thị",
    unsubWhy: "Bạn nhận được email này vì đã đồng ý nhận thông tin tiếp thị khi đăng ký VaraClip.",
  },
  en: {
    welcomeSubject: "Welcome to VaraClip",
    welcomeTitle: (n: string) => `Hi ${n}, welcome to VaraClip!`,
    welcomeBody: "Your account has been created. Please confirm your email address so we can help you recover your password if you ever need to.",
    welcomeBtn: "Confirm email",
    welcomeNoBtn: "You can start watching videos, following salons and booking right now.",
    welcomeIgnore: "If you did not sign up for this account, you can ignore this email.",
    confirmSubject: "Confirm your email to finish signing up to VaraClip",
    confirmTitle: (n: string) => `Hi ${n}, one more step!`,
    confirmBody: "Tap the button below to confirm your email address and finish creating your VaraClip account. The link is valid for 24 hours.",
    confirmBtn: "Finish sign-up",
    resetSubject: "Reset your VaraClip password",
    resetTitle: "Reset your password",
    resetBody: "We received a request to reset the password of your account. Tap the button below to choose a new one. The link is valid for 1 hour.",
    resetBtn: "Choose a new password",
    resetIgnore: "If you did not ask for this, ignore this email; your password is safe.",
    unsub: "Unsubscribe from marketing emails",
    unsubWhy: "You are receiving this because you agreed to marketing messages when you signed up for VaraClip.",
  },
} as const;

const p = (s: string) => `<p style="margin:0 0 14px">${escapeHtml(s)}</p>`;

export function welcomeMail(to: string, name: string, locale: string, verifyUrl?: string): MailInput {
  const t = T[lang(locale)];
  return {
    to,
    subject: t.welcomeSubject,
    text: `${t.welcomeTitle(name)}\n\n${verifyUrl ? t.welcomeBody : t.welcomeNoBtn}\n${verifyUrl ?? SITE_URL}\n\n${t.welcomeIgnore}`,
    html: layout({
      title: t.welcomeTitle(name),
      bodyHtml: p(verifyUrl ? t.welcomeBody : t.welcomeNoBtn),
      button: { label: verifyUrl ? t.welcomeBtn : "VaraClip", url: verifyUrl ?? SITE_URL },
      footer: escapeHtml(t.welcomeIgnore),
    }),
  };
}

export function confirmSignupMail(to: string, name: string, locale: string, url: string): MailInput {
  const t = T[lang(locale)];
  return {
    to,
    subject: t.confirmSubject,
    text: `${t.confirmTitle(name)}\n\n${t.confirmBody}\n${url}\n\n${t.welcomeIgnore}`,
    html: layout({ title: t.confirmTitle(name), bodyHtml: p(t.confirmBody), button: { label: t.confirmBtn, url }, footer: escapeHtml(t.welcomeIgnore) }),
  };
}

export function resetMail(to: string, locale: string, url: string): MailInput {
  const t = T[lang(locale)];
  return {
    to,
    subject: t.resetSubject,
    text: `${t.resetTitle}\n\n${t.resetBody}\n${url}\n\n${t.resetIgnore}`,
    html: layout({ title: t.resetTitle, bodyHtml: p(t.resetBody), button: { label: t.resetBtn, url }, footer: escapeHtml(t.resetIgnore) }),
  };
}

/** A marketing email written by an admin, with the unsubscribe link every marketing email needs. */
export function marketingMail(to: string, subject: string, bodyHtml: string, bodyText: string, unsubscribe: string, locale = "vi"): MailInput {
  const t = T[lang(locale)];
  return {
    to,
    subject,
    unsubscribeUrl: unsubscribe,
    text: `${bodyText}\n\n--\n${t.unsubWhy}\n${t.unsub}: ${unsubscribe}`,
    html: layout({
      title: subject,
      bodyHtml,
      footer: `${escapeHtml(t.unsubWhy)}<br><a href="${unsubscribe}" style="color:#777">${escapeHtml(t.unsub)}</a>`,
    }),
  };
}
