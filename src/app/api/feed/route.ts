import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { forYou, hydrate, videoInclude } from "@/lib/videos";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tab = url.searchParams.get("tab") === "following" ? "following" : "foryou";
  const exclude = (url.searchParams.get("exclude") ?? "").split(",").filter(Boolean).slice(0, 200);

  if (tab === "following") {
    const me = await getUser();
    if (!me) return NextResponse.json({ videos: [], needsLogin: true });
    const rows = await db.video.findMany({
      where: {
        creator: { followers: { some: { followerId: me.id } } },
        ...(exclude.length ? { id: { notIn: exclude } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: videoInclude,
    });
    return NextResponse.json({ videos: await hydrate(rows) });
  }

  return NextResponse.json({ videos: await hydrate(await forYou(15, exclude)) });
}
