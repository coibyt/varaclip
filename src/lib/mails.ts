import { SITE_URL, type MailInput } from "./mail";
import { emailShell, para } from "./email-shell";

/** Every email VaraClip sends. Vietnamese for Vietnamese visitors, English for everyone else. */
type Lang = "vi" | "en";
const lang = (locale: string): Lang => (locale === "vi" ? "vi" : "en");

const T = {
  vi: {
    welcomeSubject: (n: string) => `Chào mừng ${n} đến với VaraClip 💖`,
    welcomePre: "Tài khoản của bạn đã sẵn sàng. Cùng khám phá những video làm đẹp từ các salon nhé.",
    welcomeEyebrow: "Chào mừng",
    welcomeTitle: "Làm đẹp bắt đầu từ một video",
    welcomeSub: "Cảm ơn bạn đã tham gia cộng đồng VaraClip, nơi các salon chia sẻ những khoảnh khắc làm đẹp thật nhất.",
    hi: (n: string) => `Chào ${n},`,
    welcomeBody: "Tài khoản của bạn đã sẵn sàng. Chúng tôi rất vui vì có bạn ở đây.",
    welcomeVerify: "Chỉ còn một bước nhỏ: hãy xác nhận địa chỉ email để tài khoản của bạn luôn an toàn và bạn có thể lấy lại mật khẩu khi cần.",
    welcomeVerifyBtn: "Xác nhận email của tôi",
    welcomeExploreBtn: "Bắt đầu khám phá",
    welcomeSalonBtn: "Đăng video đầu tiên",
    verifyNoteTitle: "Vì sao cần xác nhận email?",
    verifyNote: "Việc này giúp bảo vệ tài khoản và đảm bảo bạn nhận được email đặt lại mật khẩu. Liên kết có hiệu lực trong 7 ngày.",
    notYouTitle: "Không phải bạn đăng ký?",
    notYou: "Bạn có thể bỏ qua email này, sẽ không có tài khoản nào được kích hoạt.",
    welcomeReason: "Bạn nhận email này vì đã đăng ký tài khoản VaraClip.",
    customerCards: [
      { icon: "🎬", title: "Xem video từ các salon", text: "Cuộn xem hàng trăm video làm tóc, nail, makeup, spa… từ các salon gần bạn." },
      { icon: "💖", title: "Thích, bình luận, theo dõi", text: "Lưu lại kiểu bạn yêu thích và nhắn tin trực tiếp cho salon." },
      { icon: "📅", title: "Đặt lịch chỉ một chạm", text: "Thấy kiểu ưng ý? Bấm “Đặt lịch” ngay trên video." },
      { icon: "🔴", title: "Xem livestream", text: "Theo dõi các buổi phát trực tiếp và trò chuyện cùng salon." },
    ],
    salonCards: [
      { icon: "🎥", title: "Đăng video đầu tiên", text: "Quay kết quả làm đẹp của khách, thêm nhạc, chữ và hiệu ứng ngay trong ứng dụng." },
      { icon: "📅", title: "Gắn link đặt lịch", text: "Thêm trang đặt lịch miễn phí của VaraaAi để khách đặt lịch chỉ bằng một chạm." },
      { icon: "🔴", title: "Phát trực tiếp", text: "Livestream bằng camera hoặc qua YouTube, Facebook, TikTok và chat cùng khách." },
    ],
    confirmSubject: "Xác nhận email để hoàn tất đăng ký VaraClip",
    confirmPre: "Chỉ còn một bước: bấm nút để hoàn tất việc tạo tài khoản của bạn.",
    confirmEyebrow: "Chỉ còn một bước",
    confirmTitle: "Xác nhận email của bạn",
    confirmSub: "Bấm nút bên dưới để hoàn tất việc tạo tài khoản VaraClip.",
    confirmBody: "Cảm ơn bạn đã đăng ký! Tài khoản của bạn sẽ được tạo ngay sau khi bạn xác nhận địa chỉ email này. Liên kết có hiệu lực trong 24 giờ.",
    confirmBtn: "Hoàn tất đăng ký",
    resetSubject: "Đặt lại mật khẩu VaraClip",
    resetPre: "Chọn mật khẩu mới cho tài khoản của bạn. Liên kết có hiệu lực trong 1 giờ.",
    resetEyebrow: "Bảo mật tài khoản",
    resetTitle: "Đặt lại mật khẩu",
    resetSub: "Chọn mật khẩu mới chỉ trong vài giây.",
    resetBody: "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản VaraClip của bạn. Bấm nút bên dưới để chọn mật khẩu mới. Liên kết có hiệu lực trong 1 giờ và chỉ dùng được một lần.",
    resetBtn: "Chọn mật khẩu mới",
    resetNoteTitle: "Không phải bạn yêu cầu?",
    resetNote: "Hãy bỏ qua email này, mật khẩu của bạn vẫn an toàn và không có gì thay đổi.",
    resetReason: "Bạn nhận email này vì có yêu cầu đặt lại mật khẩu cho tài khoản của bạn.",
    changedSubject: "Mật khẩu VaraClip của bạn đã được thay đổi",
    changedPre: "Mật khẩu tài khoản của bạn vừa được thay đổi.",
    changedEyebrow: "Bảo mật tài khoản",
    changedTitle: "Mật khẩu đã được thay đổi",
    changedSub: "Đây là thông báo để bạn yên tâm.",
    changedBody: (when: string) => `Mật khẩu tài khoản VaraClip của bạn vừa được thay đổi vào lúc ${when}. Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.`,
    changedBtn: "Đăng nhập",
    changedNoteTitle: "Không phải bạn?",
    changedNote: "Hãy đặt lại mật khẩu ngay và trả lời email này để chúng tôi giúp bạn bảo vệ tài khoản.",
    changedReason: "Bạn nhận email này vì lý do bảo mật tài khoản.",
    marketEyebrow: "Tin từ VaraClip",
    marketReason: "Bạn nhận email này vì đã đồng ý nhận thông tin tiếp thị khi đăng ký VaraClip.",
  },
  en: {
    welcomeSubject: (n: string) => `Welcome to VaraClip, ${n} 💖`,
    welcomePre: "Your account is ready. Let’s explore beauty videos from salons together.",
    welcomeEyebrow: "Welcome",
    welcomeTitle: "Beauty starts with a video",
    welcomeSub: "Thank you for joining VaraClip, where salons share their most genuine beauty moments.",
    hi: (n: string) => `Hi ${n},`,
    welcomeBody: "Your account is ready. We are so happy to have you here.",
    welcomeVerify: "Just one small step left: please confirm your email address so your account stays safe and you can recover your password if you ever need to.",
    welcomeVerifyBtn: "Confirm my email",
    welcomeExploreBtn: "Start exploring",
    welcomeSalonBtn: "Post your first video",
    verifyNoteTitle: "Why confirm your email?",
    verifyNote: "It protects your account and makes sure you receive password-reset emails. The link is valid for 7 days.",
    notYouTitle: "Did not sign up?",
    notYou: "You can ignore this email. No account will be activated.",
    welcomeReason: "You are receiving this because you signed up for a VaraClip account.",
    customerCards: [
      { icon: "🎬", title: "Watch videos from salons", text: "Scroll hundreds of hair, nail, makeup and spa videos from salons near you." },
      { icon: "💖", title: "Like, comment, follow", text: "Save the looks you love and message salons directly." },
      { icon: "📅", title: "Book in one tap", text: "Found a look you like? Tap “Book” right on the video." },
      { icon: "🔴", title: "Watch live streams", text: "Follow live broadcasts and chat with the salon." },
    ],
    salonCards: [
      { icon: "🎥", title: "Post your first video", text: "Film your clients’ results, add music, text and effects right in the app." },
      { icon: "📅", title: "Add your booking link", text: "Add a free VaraaAi booking page so clients can book in one tap." },
      { icon: "🔴", title: "Go live", text: "Stream with your camera or through YouTube, Facebook or TikTok and chat with clients." },
    ],
    confirmSubject: "Confirm your email to finish signing up to VaraClip",
    confirmPre: "One last step: tap the button to finish creating your account.",
    confirmEyebrow: "One last step",
    confirmTitle: "Confirm your email",
    confirmSub: "Tap the button below to finish creating your VaraClip account.",
    confirmBody: "Thank you for signing up! Your account will be created as soon as you confirm this email address. The link is valid for 24 hours.",
    confirmBtn: "Finish sign-up",
    resetSubject: "Reset your VaraClip password",
    resetPre: "Choose a new password for your account. The link is valid for 1 hour.",
    resetEyebrow: "Account security",
    resetTitle: "Reset your password",
    resetSub: "Choose a new password in a few seconds.",
    resetBody: "We received a request to reset the password of your VaraClip account. Tap the button below to choose a new one. The link is valid for 1 hour and can be used once.",
    resetBtn: "Choose a new password",
    resetNoteTitle: "Did not ask for this?",
    resetNote: "Just ignore this email. Your password is safe and nothing has changed.",
    resetReason: "You are receiving this because a password reset was requested for your account.",
    changedSubject: "Your VaraClip password was changed",
    changedPre: "The password of your account was just changed.",
    changedEyebrow: "Account security",
    changedTitle: "Your password was changed",
    changedSub: "A quick note for your peace of mind.",
    changedBody: (when: string) => `The password of your VaraClip account was changed on ${when}. You can log in with your new password right away.`,
    changedBtn: "Log in",
    changedNoteTitle: "Was this not you?",
    changedNote: "Reset your password right away and reply to this email so we can help you secure your account.",
    changedReason: "You are receiving this for your account’s security.",
    marketEyebrow: "News from VaraClip",
    marketReason: "You are receiving this because you agreed to marketing messages when you signed up for VaraClip.",
  },
} as const;

const plain = (...parts: (string | undefined)[]) => parts.filter(Boolean).join("\n\n");

export function welcomeMail(to: string, name: string, locale: string, verifyUrl?: string, isSalon = false): MailInput {
  const t = T[lang(locale)];
  const url = verifyUrl ?? (isSalon ? `${SITE_URL}/upload` : SITE_URL);
  const label = verifyUrl ? t.welcomeVerifyBtn : isSalon ? t.welcomeSalonBtn : t.welcomeExploreBtn;
  const cards = isSalon ? t.salonCards : t.customerCards;
  return {
    to,
    subject: t.welcomeSubject(name),
    text: plain(t.hi(name), t.welcomeBody, verifyUrl && t.welcomeVerify, `${label}: ${url}`, ...cards.map((c) => `${c.icon} ${c.title}: ${c.text}`), t.notYou),
    html: emailShell({
      locale, to, preheader: t.welcomePre, eyebrow: t.welcomeEyebrow, title: t.welcomeTitle, subtitle: t.welcomeSub, greeting: t.hi(name),
      bodyHtml: para(t.welcomeBody) + (verifyUrl ? para(t.welcomeVerify) : ""),
      button: { label, url }, cards: [...cards],
      note: verifyUrl ? { title: t.verifyNoteTitle, text: t.verifyNote } : { title: t.notYouTitle, text: t.notYou },
      reason: t.welcomeReason,
    }),
  };
}

export function confirmSignupMail(to: string, name: string, locale: string, url: string): MailInput {
  const t = T[lang(locale)];
  return {
    to,
    subject: t.confirmSubject,
    text: plain(t.hi(name), t.confirmBody, `${t.confirmBtn}: ${url}`, `${t.notYouTitle} ${t.notYou}`),
    html: emailShell({
      locale, to, preheader: t.confirmPre, eyebrow: t.confirmEyebrow, title: t.confirmTitle, subtitle: t.confirmSub, greeting: t.hi(name),
      bodyHtml: para(t.confirmBody), button: { label: t.confirmBtn, url }, note: { title: t.notYouTitle, text: t.notYou }, reason: t.welcomeReason,
    }),
  };
}

export function resetMail(to: string, locale: string, url: string, name?: string): MailInput {
  const t = T[lang(locale)];
  return {
    to,
    subject: t.resetSubject,
    text: plain(name && t.hi(name), t.resetBody, `${t.resetBtn}: ${url}`, `${t.resetNoteTitle} ${t.resetNote}`),
    html: emailShell({
      locale, to, preheader: t.resetPre, eyebrow: t.resetEyebrow, title: t.resetTitle, subtitle: t.resetSub, greeting: name ? t.hi(name) : undefined,
      bodyHtml: para(t.resetBody), button: { label: t.resetBtn, url }, note: { title: t.resetNoteTitle, text: t.resetNote }, reason: t.resetReason,
    }),
  };
}

export function passwordChangedMail(to: string, locale: string, name?: string): MailInput {
  const t = T[lang(locale)];
  const when = new Date().toLocaleString(locale === "vi" ? "vi-VN" : "en-GB", { timeZone: "Europe/Helsinki", dateStyle: "long", timeStyle: "short" });
  return {
    to,
    subject: t.changedSubject,
    text: plain(name && t.hi(name), t.changedBody(when), `${t.changedBtn}: ${SITE_URL}/login`, `${t.changedNoteTitle} ${t.changedNote}`),
    html: emailShell({
      locale, to, preheader: t.changedPre, eyebrow: t.changedEyebrow, title: t.changedTitle, subtitle: t.changedSub, greeting: name ? t.hi(name) : undefined,
      bodyHtml: para(t.changedBody(when)), button: { label: t.changedBtn, url: `${SITE_URL}/login` }, note: { title: t.changedNoteTitle, text: t.changedNote }, reason: t.changedReason,
    }),
  };
}

/** A marketing email written by an admin, in the VaraClip design, with the unsubscribe link every marketing email needs. */
export function marketingMail(
  to: string, subject: string, bodyHtml: string, bodyText: string, unsubscribe: string,
  opts: { name?: string; button?: { label: string; url: string }; locale?: string } = {},
): MailInput {
  const locale = opts.locale ?? "vi";
  const t = T[lang(locale)];
  return {
    to,
    subject,
    unsubscribeUrl: unsubscribe,
    text: plain(opts.name && t.hi(opts.name), bodyText, opts.button && `${opts.button.label}: ${opts.button.url}`, `--\n${t.marketReason}\n${unsubscribe}`),
    html: emailShell({
      locale, to, preheader: bodyText.replace(/\s+/g, " ").slice(0, 110), eyebrow: t.marketEyebrow, title: subject,
      greeting: opts.name ? t.hi(opts.name) : undefined, bodyHtml, button: opts.button, reason: t.marketReason, unsubscribe,
    }),
  };
}
