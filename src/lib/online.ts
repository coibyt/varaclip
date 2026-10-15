/**
 * Who is on the website right now. Every open tab pings the server every ~25 seconds; a visitor
 * counts as "online" if the last ping was less than a minute ago. Kept in memory because it is
 * only about the present moment (it starts from zero after a server restart and refills in seconds).
 */
const g = globalThis as unknown as { __vcOnline?: Map<string, number> };
const seen: Map<string, number> = (g.__vcOnline ??= new Map());

export const ONLINE_WINDOW_MS = 60_000;

export function markOnline(key: string) {
  const now = Date.now();
  seen.set(key, now);
  if (seen.size > 5000) for (const [k, t] of seen) if (now - t > ONLINE_WINDOW_MS) seen.delete(k);
}

export function onlineNow() {
  const now = Date.now();
  let n = 0;
  for (const t of seen.values()) if (now - t < ONLINE_WINDOW_MS) n++;
  return n;
}

/** Calendar day (YYYY-MM-DD) in Helsinki, where the business is based. */
export function helsinkiDay(d: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Helsinki", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
