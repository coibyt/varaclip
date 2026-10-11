"use client";

import { createContext, useContext, useMemo } from "react";
import { makeT, type Locale, type Messages, type T } from "@/lib/i18n";

const Ctx = createContext<{ locale: Locale; t: T } | null>(null);

export function LocaleProvider({
  locale, messages, fallback, children,
}: { locale: Locale; messages: Messages; fallback: Messages; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, t: makeT(messages, fallback) }), [locale, messages, fallback]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n outside LocaleProvider");
  return v;
}
export const useT = () => useI18n().t;
