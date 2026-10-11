import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { CalendarCheck, MapPin, Phone, Settings } from "lucide-react";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { hydrate, videoInclude } from "@/lib/videos";
import { mediaUrl } from "@/lib/storage";
import { compact } from "@/lib/util";
import { Avatar } from "@/components/avatar";
import { FollowButton } from "@/components/follow-button";
import { VideoGrid } from "@/components/video-grid";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const u = await db.user.findUnique({ where: { handle: (await params).handle } });
  return u ? { title: `${u.salonName || u.displayName} (@${u.handle})`, description: u.bio || undefined } : {};
}

export default async function Profile({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { handle } = await params;
  const tab = (await searchParams).tab === "saved" ? "saved" : "videos";
  const [u, me] = await Promise.all([db.user.findUnique({ where: { handle } }), getUser()]);
  if (!u) notFound();
  const mine = me?.id === u.id;

  const [followers, following, likeAgg, isFollowing, rows] = await Promise.all([
    db.follow.count({ where: { followingId: u.id } }),
    db.follow.count({ where: { followerId: u.id } }),
    db.like.count({ where: { video: { creatorId: u.id } } }),
    me ? db.follow.findUnique({ where: { followerId_followingId: { followerId: me.id, followingId: u.id } } }) : null,
    tab === "saved" && mine
      ? db.video.findMany({ where: { saves: { some: { userId: u.id } } }, orderBy: { createdAt: "desc" }, include: videoInclude })
      : db.video.findMany({ where: { creatorId: u.id }, orderBy: { createdAt: "desc" }, include: videoInclude }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-28 pt-8 lg:pb-12">
      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        <Avatar name={u.displayName} hue={u.hue} url={mediaUrl(u.avatarKey)} size={112} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">{u.salonName || u.displayName}</h1>
          <p className="text-mist">@{u.handle}{u.isSalon && u.salonName ? ` · ${u.displayName}` : ""}</p>

          <dl className="mt-4 flex justify-center gap-6 sm:justify-start">
            {[["Đang theo dõi", following], ["Người theo dõi", followers], ["Lượt thích", likeAgg]].map(([k, n]) => (
              <div key={k as string}><dd className="text-lg font-extrabold tabular-nums">{compact(n as number)}</dd><dt className="text-xs text-mist">{k}</dt></div>
            ))}
          </dl>

          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            {mine ? (
              <Link href="/settings" className="btn btn-ghost"><Settings className="size-5" aria-hidden /> Sửa hồ sơ</Link>
            ) : (
              <FollowButton handle={u.handle} initial={Boolean(isFollowing)} loggedIn={Boolean(me)} />
            )}
            {u.bookingUrl && <a href={u.bookingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary"><CalendarCheck className="size-5" aria-hidden /> Đặt lịch</a>}
            {u.phone && <a href={`tel:${u.phone.replace(/[^+\d]/g, "")}`} className="btn btn-ghost"><Phone className="size-5" aria-hidden /> {u.phone}</a>}
          </div>

          {u.bio && <p className="mt-4 whitespace-pre-line text-[15px] text-white/90">{u.bio}</p>}
          {u.city && <p className="mt-2 flex items-center justify-center gap-1 text-sm text-mist sm:justify-start"><MapPin className="size-4 text-gold" aria-hidden /> {u.city}</p>}
        </div>
      </header>

      <nav className="mt-8 flex border-b border-white/10" aria-label="Nội dung">
        {[["videos", "Video"], ...(mine ? [["saved", "Đã lưu"]] : [])].map(([k, label]) => (
          <Link key={k} href={`/u/${u.handle}${k === "saved" ? "?tab=saved" : ""}`} aria-current={tab === k ? "page" : undefined} className={`min-h-[48px] flex-1 border-b-2 px-4 py-3 text-center text-sm font-bold transition sm:flex-none sm:px-8 ${tab === k ? "border-glow text-white" : "border-transparent text-mist hover:text-white"}`}>
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-4">
        <VideoGrid videos={await hydrate(rows)} empty={tab === "saved" ? "Bạn chưa lưu video nào." : mine && u.isSalon ? "Bạn chưa đăng video nào. Bấm “Đăng video” để bắt đầu!" : "Chưa có video."} />
      </div>
    </div>
  );
}
