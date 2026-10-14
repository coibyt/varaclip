import { NextResponse } from "next/server";
import { z } from "zod";
import { rememberSearch } from "@/lib/interests";

/** The discover page reports what the visitor searched for, so the home feed can favour those topics. */
export async function POST(req: Request) {
  const p = z.object({ q: z.string().max(80) }).safeParse(await req.json().catch(() => null));
  if (p.success) await rememberSearch(p.data.q);
  return NextResponse.json({ ok: true });
}
