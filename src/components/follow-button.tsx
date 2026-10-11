"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, UserPlus } from "lucide-react";
import { useT } from "./locale-provider";

export function FollowButton({ handle, initial, loggedIn }: { handle: string; initial: boolean; loggedIn: boolean }) {
  const router = useRouter();
  const t = useT();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function click() {
    if (!loggedIn) return router.push(`/login?next=/u/${handle}`);
    setBusy(true);
    setOn(!on);
    const r = await fetch(`/api/users/${handle}/follow`, { method: "POST" });
    if (!r.ok) setOn(on);
    else router.refresh();
    setBusy(false);
  }

  return (
    <button onClick={click} disabled={busy} aria-pressed={on} className={`btn ${on ? "btn-ghost" : "btn-primary"}`}>
      {on ? <><Check className="size-5" aria-hidden /> {t("common.following")}</> : <><UserPlus className="size-5" aria-hidden /> {t("common.follow")}</>}
    </button>
  );
}
