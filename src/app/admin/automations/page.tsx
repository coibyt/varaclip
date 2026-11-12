import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { AutomationsManager } from "@/components/automations-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Email tự động" };

export default async function Page() {
  if (!isAdminUser(await getUser())) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-8 lg:pb-12">
      <Link href="/admin" className="text-sm text-mist hover:underline">← Quản trị</Link>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Email marketing tự động</h1>
      <p className="mt-1 text-mist">Tự động chăm sóc khách hàng và chủ salon bằng email. Bật từng loại email, sửa nội dung, gửi thử cho mình trước khi bật.</p>
      <AutomationsManager />
    </div>
  );
}
