import { cookies } from "next/headers";
import { db } from "./db";
import { getUser } from "./auth";

export const INTEREST_COOKIE = "vc_interest";
const MAX_TERMS = 12;

export type Interests = {
  /** topic (a video tag) -> how strongly this viewer cares about it */
  tags: Map<string, number>;
  /** words this viewer searched for recently, newest first */
  terms: string[];
};

/** A search text reduced to something comparable with tags: lowercase, no '#', 2-40 characters. */
export function normalizeTerm(raw: string) {
  const t = raw.replace(/^#/, "").trim().toLowerCase().replace(/\s+/g, " ");
  return t.length >= 2 && t.length <= 40 ? t : "";
}

export async function readSearchTerms(): Promise<string[]> {
  const raw = (await cookies()).get(INTEREST_COOKIE)?.value;
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string").slice(0, MAX_TERMS) : [];
  } catch {
    return [];
  }
}

export async function rememberSearch(raw: string) {
  const term = normalizeTerm(raw);
  if (!term) return;
  const list = [term, ...(await readSearchTerms()).filter((x) => x !== term)].slice(0, MAX_TERMS);
  (await cookies()).set(INTEREST_COOKIE, JSON.stringify(list), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 90,
  });
}

/**
 * What this viewer is into: recent searches (kept in a cookie, works for guests too) plus, for signed-in
 * viewers, the topics of the videos they commented on (strongest), liked and saved.
 */
export async function loadInterests(): Promise<Interests> {
  const [terms, me] = await Promise.all([readSearchTerms(), getUser()]);
  const tags = new Map<string, number>();
  if (me) {
    const add = (tagStr: string, w: number) => {
      for (const tag of tagStr.split(" ").filter(Boolean)) tags.set(tag, (tags.get(tag) ?? 0) + w);
    };
    const [likes, comments, saves] = await Promise.all([
      db.like.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 60, select: { video: { select: { tags: true } } } }),
      db.comment.findMany({ where: { authorId: me.id }, orderBy: { createdAt: "desc" }, take: 60, select: { video: { select: { tags: true } } } }),
      db.save.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 40, select: { video: { select: { tags: true } } } }),
    ]).catch(() => [[], [], []] as { video: { tags: string } }[][]);
    for (const l of likes) add(l.video.tags, 2);
    for (const c of comments) add(c.video.tags, 3);
    for (const s of saves) add(s.video.tags, 2);
  }
  return { tags, terms };
}

/** How well a video matches the viewer's interests (0 = not at all). */
export function affinity(v: { tags: string; caption: string }, it: Interests) {
  let a = 0;
  for (const tag of v.tags.split(" ").filter(Boolean)) a += it.tags.get(tag) ?? 0;
  if (it.terms.length) {
    const hay = ` ${v.tags} ${v.caption}`.toLowerCase();
    // a search matters most, and the most recent search matters most of all
    it.terms.forEach((term, i) => { if (hay.includes(term)) a += 6 - Math.min(i, 4); });
  }
  return a;
}
