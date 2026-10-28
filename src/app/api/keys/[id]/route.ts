import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { revokeApiKey } from "@/lib/api-keys";

/** Settings: revoke a key; software using it stops working at once. */
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await revokeApiKey(me.id, (await params).id).catch(() => null);
  return NextResponse.json({ ok: true });
}
