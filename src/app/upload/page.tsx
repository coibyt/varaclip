import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { UploadForm } from "@/components/upload-form";

export const metadata = { title: "Đăng video" };

export default async function Page() {
  const me = await getUser();
  if (!me) redirect("/login?next=/upload");
  if (!me.isSalon) redirect("/register?salon=1");
  return <UploadForm />;
}
