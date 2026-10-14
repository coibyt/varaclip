"use client";

import { useEffect } from "react";

/** Reports a search to the server once, so the "For You" feed can lean towards that topic. */
export function TrackSearch({ q }: { q: string }) {
  useEffect(() => {
    if (q.replace(/^#/, "").trim().length < 2) return;
    fetch("/api/interest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q }) }).catch(() => {});
  }, [q]);
  return null;
}
