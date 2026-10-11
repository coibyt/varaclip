import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, Heart, MessageCircle, Plus, Users } from "lucide-react";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { hydrate, videoInclude } from "@/lib/videos";
import { compact } from "@/lib/util";
import { StudioRow } from "@/components/studio-row";

export const metadata = { title: "Studio" };
export const dynamic = "force-dynamic";

export default async function Studio() {
  const me = await getUser();
  if (!me) redirect("/login?next=/studio");
  if (!me.isSalon) redirect("/register?salon=1");

  const [rows, followers, likes, comments] = await Promise.all([
    db.video.findMany({ where: { creatorId: me.id }, orderBy: { createdAt: "desc" }, include: videoInclude }),
    db.follow.count({ where: { followingId: me.id } }),
    db.like.count({ where: { video: { creatorId: me.id } } }),
    db.comment.count({ where: { video: { creatorId: me.id } } }),
  ]);
  const videos = await hydrate(rows);
  const views = rows.reduce((s, v) => s + v.views, 0);

  const stats = [
    { label: "Lượt xem", value: views, icon: Eye },
    { label: "Lượt thích", value: likes, icon: Heart },
    { label: "Bình luận", value: comments, icon: MessageCircle },
    { label: "Người theo dõi", value: followers, icon: Users },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-8 lg:pb-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Studio</h1>
        <Link href="/upload" className="btn btn-primary"><Plus className="size-5" aria-hidden /> Đăng video</Link>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-ink-2 p-4">
            <s.icon className="size-5 text-glow" aria-hidden />
            <dd className="mt-2 text-2xl font-extrabold tabular-nums">{compact(s.value)}</dd>
            <dt className="text-xs text-mist">{s.label}</dt>
          </div>
        ))}
      </dl>

      <h2 className="mb-3 mt-10 text-sm font-bold uppercase tracking-wider text-mist">Video của bạn ({videos.length})</h2>
      {videos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
          <p className="font-bold">Chưa có video nào</p>
          <p className="mt-1 text-sm text-mist">Đăng video đầu tiên để khách hàng biết đến salon của bạn.</p>
          <Link href="/upload" className="btn btn-primary mt-4">Đăng video</Link>
        </div>
      ) : (
        <ul className="space-y-3">{videos.map((v) => <StudioRow key={v.id} v={v} />)}</ul>
      )}
    </div>
  );
}
