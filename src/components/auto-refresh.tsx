"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-runs the server page every few seconds (only while the tab is visible). */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const iv = setInterval(() => { if (!document.hidden) router.refresh(); }, seconds * 1000);
    return () => clearInterval(iv);
  }, [router, seconds]);
  return null;
}
