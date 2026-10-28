import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { db } from "./db";

/**
 * Personal API keys for posting software ("Authorization: Bearer vc_..."). A key can only post, list,
 * edit and delete its owner's videos: it never reads messages or changes settings. Only a hash is stored,
 * so a key is shown once, when it is created.
 */
export const MAX_KEYS = 10;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const KEY_RE = /^vc_[A-Za-z0-9]{40}$/;

export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

function generate() {
  const bytes = randomBytes(40);
  let s = "vc_";
  for (let i = 0; i < 40; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}

export async function createApiKey(userId: string, name: string): Promise<{ key: string } | { error: "tooMany" }> {
  const active = await db.apiKey.count({ where: { userId, revokedAt: null } });
  if (active >= MAX_KEYS) return { error: "tooMany" };
  const key = generate();
  await db.apiKey.create({ data: { userId, name: name.trim().slice(0, 60) || "API key", prefix: key.slice(0, 10), keyHash: hashKey(key) } });
  return { key };
}

export const listApiKeys = (userId: string) =>
  db.apiKey.findMany({ where: { userId, revokedAt: null }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true } });

export const revokeApiKey = (userId: string, id: string) =>
  db.apiKey.updateMany({ where: { id, userId, revokedAt: null }, data: { revokedAt: new Date() } });

// ── simple per-key rate limits (in memory): 60 requests a minute, 30 new videos an hour
const g = globalThis as unknown as { __vcApiHits?: Map<string, number[]> };
const hits: Map<string, number[]> = (g.__vcApiHits ??= new Map());
function allowed(bucket: string, limit: number, windowMs: number) {
  const now = Date.now();
  const list = (hits.get(bucket) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= limit) { hits.set(bucket, list); return false; }
  list.push(now);
  hits.set(bucket, list);
  if (hits.size > 2000) for (const [k, v] of hits) if (!v.some((t) => now - t < 3600_000)) hits.delete(k);
  return true;
}

export const apiError = (error: string, status: number, code?: string) => NextResponse.json({ error, ...(code ? { code } : {}) }, { status });

export type ApiUser = { id: string; handle: string; displayName: string; salonName: string; isSalon: boolean };

/** Checks the request's API key. Returns the key's owner, or a ready-made error response. */
export async function authenticateApi(req: Request, opts: { upload?: boolean } = {}): Promise<{ user: ApiUser } | { res: NextResponse }> {
  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.get("authorization") ?? "");
  if (!m || !KEY_RE.test(m[1])) return { res: apiError('Missing API key. Send the header "Authorization: Bearer vc_...".', 401, "no_key") };
  let row;
  try {
    row = await db.apiKey.findUnique({ where: { keyHash: hashKey(m[1]) } });
  } catch {
    return { res: apiError("API keys are not set up on this server yet.", 503, "not_configured") };
  }
  if (!row || row.revokedAt) return { res: apiError("Invalid or revoked API key.", 401, "bad_key") };
  if (!allowed(`k:${row.id}`, 60, 60_000)) return { res: apiError("Too many requests, try again in a minute.", 429, "rate_limited") };
  if (opts.upload && !allowed(`u:${row.userId}`, 30, 3600_000)) return { res: apiError("At most 30 videos per hour.", 429, "upload_limit") };
  const user = await db.user.findUnique({ where: { id: row.userId }, select: { id: true, handle: true, displayName: true, salonName: true, isSalon: true } });
  if (!user) return { res: apiError("The account of this key no longer exists.", 401, "bad_key") };
  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > 60_000) {
    db.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  }
  return { user };
}
