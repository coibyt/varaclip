"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Check, Download, Share, X } from "lucide-react";
import { useT } from "./locale-provider";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

// The browser fires "beforeinstallprompt" once, so it is kept here and shared by every install button.
let deferred: InstallEvent | null = null;
let installed = false;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    notify();
  });
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};

function useInstall() {
  const canPrompt = useSyncExternalStore(subscribe, () => deferred !== null, () => false);
  const done = useSyncExternalStore(subscribe, () => installed, () => false);
  const [env, setEnv] = useState({ standalone: false, ios: false });
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setEnv({ standalone, ios });
  }, []);
  async function install() {
    if (!deferred) return;
    const ev = deferred;
    deferred = null;
    notify();
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    if (outcome === "accepted") { installed = true; notify(); }
  }
  return { canPrompt, installed: done || env.standalone, ios: env.ios, install };
}

/** Steps for browsers that cannot install with one tap. */
function Steps({ ios }: { ios: boolean }) {
  const t = useT();
  return (
    <p className="whitespace-pre-line rounded-xl bg-ink-2 px-4 py-3 text-sm leading-relaxed text-white/85">{ios ? t("pwa.iosSteps") : t("pwa.manual")}</p>
  );
}

/** "Install app" button: one tap on Android and desktop Chrome / Edge, short steps on iPhone and other browsers. */
export function InstallButton({ className = "", showSteps = true }: { className?: string; showSteps?: boolean }) {
  const t = useT();
  const { canPrompt, installed: isInstalled, ios, install } = useInstall();
  const [help, setHelp] = useState(false);

  if (isInstalled) return <p className="flex items-center gap-2 text-sm text-emerald-300"><Check className="size-4" aria-hidden /> {t("pwa.installed")}</p>;
  return (
    <div className={className}>
      <button type="button" onClick={() => (canPrompt ? install() : setHelp((h) => !h))} className="btn btn-primary w-full">
        {ios && !canPrompt ? <Share className="size-5" aria-hidden /> : <Download className="size-5" aria-hidden />} {t("pwa.install")}
      </button>
      {help && showSteps && <div className="mt-2"><Steps ios={ios} /></div>}
    </div>
  );
}

/** Big panel for the /install page. */
export function InstallPanel() {
  const t = useT();
  const { canPrompt, installed: isInstalled, ios } = useInstall();
  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-16 text-center lg:pb-12">
      <span className="mx-auto grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-glow to-gold text-4xl font-extrabold text-ink">V</span>
      <h1 className="mt-6 text-2xl font-extrabold tracking-tight">{t("pwa.title")}</h1>
      <p className="mt-3 text-white/85">{t("pwa.sub")}</p>
      <div className="mt-6"><InstallButton showSteps={false} /></div>
      {!isInstalled && !canPrompt && <div className="mt-3 text-left"><Steps ios={ios} /></div>}
    </div>
  );
}

const DISMISS_KEY = "vc-install-dismissed";
const DISMISS_MS = 7 * 24 * 3600_000;

/** Small prompt above the mobile tab bar, shown once in a while to people who have not installed the app. */
export function InstallBanner() {
  const t = useT();
  const { canPrompt, installed: isInstalled, ios, install } = useInstall();
  const path = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let dismissed = 0;
    try { dismissed = Number(localStorage.getItem(DISMISS_KEY)) || 0; } catch { /* storage blocked */ }
    if (Date.now() - dismissed < DISMISS_MS) return;
    const id = setTimeout(() => setShow(true), 6000);
    return () => clearTimeout(id);
  }, []);

  function dismiss() {
    setShow(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
  }

  if (!show || isInstalled || (!canPrompt && !ios) || path.startsWith("/embed") || path === "/install") return null;
  return (
    <div className="fixed inset-x-3 bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom)+8px)] z-30 flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-3/95 p-3 shadow-xl backdrop-blur lg:hidden" role="dialog" aria-label={t("pwa.install")}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-glow to-gold text-lg font-extrabold text-ink">V</span>
      <p className="min-w-0 flex-1 text-sm leading-snug">{t("pwa.banner")}</p>
      {canPrompt ? (
        <button type="button" onClick={() => { void install(); dismiss(); }} className="btn btn-primary !min-h-[40px] !px-4 text-sm">{t("pwa.install")}</button>
      ) : (
        <a href="/install" className="btn btn-primary !min-h-[40px] !px-4 text-sm">{t("pwa.install")}</a>
      )}
      <button type="button" onClick={dismiss} aria-label={t("pwa.later")} className="grid size-9 shrink-0 place-items-center rounded-full text-mist hover:bg-white/10"><X className="size-4" aria-hidden /></button>
    </div>
  );
}

/** Registers the service worker that makes the site installable. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
