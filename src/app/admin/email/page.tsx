import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { EmailComposer } from "@/components/email-composer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Email" };

export default async function Page() {
  const me = await getUser();
  if (!isAdminUser(me)) notFound();
  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-8 lg:pb-12">
      <Link href="/admin" className="text-sm text-mist hover:underline">← Quản trị</Link>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Gửi email marketing</h1>
      <EmailComposer />
    </div>
  );
}
