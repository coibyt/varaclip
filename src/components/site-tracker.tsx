"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { deviceKey } from "@/lib/device";

const BEAT_MS = 25_000;

function send(type: "view" | "beat") {
  fetch("/api/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: deviceKey(), type }), keepalive: true }).catch(() => {});
}

/** Counts page views and tells the server this visitor is still on the site (for the admin statistics). */
export function SiteTracker() {
  const path = usePathname();
  const skip = path.startsWith("/admin") || path.startsWith("/embed");

  useEffect(() => {
    if (!skip) send("view");
  }, [path, skip]);

  useEffect(() => {
    if (skip) return;
    const id = setInterval(() => { if (!document.hidden) send("beat"); }, BEAT_MS);
    return () => clearInterval(id);
  }, [skip]);

  return null;
}
