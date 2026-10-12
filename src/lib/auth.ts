import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";

const COOKIE = "gr_session";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-only-secret");

export const hashPassword = (p: string) => bcrypt.hash(p, 10);
export const checkPassword = (p: string, h: string) => bcrypt.compare(p, h);

const ALTS = "gr_alts"; // sessions of the other accounts this browser has signed in to
const MAX_ALTS = 5;
const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

async function uidOf(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret());
    return String(payload.uid);
  } catch {
    return null;
  }
}

type Alt = { uid: string; token: string };

async function readAlts(): Promise<Alt[]> {
  const raw = (await cookies()).get(ALTS)?.value;
  if (!raw) return [];
  let list: unknown;
  try { list = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(list)) return [];
  const out: Alt[] = [];
  for (const token of list) {
    const uid = typeof token === "string" ? await uidOf(token) : null;
    if (uid && !out.some((a) => a.uid === uid)) out.push({ uid, token: token as string });
  }
  return out;
}

async function writeAlts(list: Alt[]) {
  const jar = await cookies();
  if (list.length) jar.set(ALTS, JSON.stringify(list.slice(0, MAX_ALTS).map((a) => a.token)), cookieOpts);
  else jar.delete(ALTS);
}

/** Remember the signed-in account so the browser can come back to it after another sign-in. */
export async function stashCurrentSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  const uid = token ? await uidOf(token) : null;
  if (!token || !uid) return;
  const rest = (await readAlts()).filter((a) => a.uid !== uid);
  await writeAlts([{ uid, token }, ...rest]);
}

export async function createSession(userId: string, keepPrevious = false) {
  if (keepPrevious) await stashCurrentSession();
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, cookieOpts);
  const alts = await readAlts();
  if (alts.some((a) => a.uid === userId)) await writeAlts(alts.filter((a) => a.uid !== userId));
}

/** The other accounts this browser can switch to. */
export async function listOtherAccounts(currentId: string) {
  const alts = (await readAlts()).filter((a) => a.uid !== currentId);
  if (!alts.length) return [];
  const users = await db.user.findMany({ where: { id: { in: alts.map((a) => a.uid) } } });
  return alts.map((a) => users.find((u) => u.id === a.uid)).filter((u): u is NonNullable<typeof u> => !!u);
}

export async function switchAccount(targetId: string) {
  const alts = await readAlts();
  const target = alts.find((a) => a.uid === targetId);
  if (!target || !(await db.user.findUnique({ where: { id: targetId }, select: { id: true } }))) return false;
  const jar = await cookies();
  const cur = jar.get(COOKIE)?.value;
  const curUid = cur ? await uidOf(cur) : null;
  const rest = alts.filter((a) => a.uid !== targetId);
  await writeAlts(cur && curUid ? [{ uid: curUid, token: cur }, ...rest] : rest);
  jar.set(COOKIE, target.token, cookieOpts);
  return true;
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return await db.user.findUnique({ where: { id: String(payload.uid) } });
  } catch {
    return null;
  }
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getUser>>>;
