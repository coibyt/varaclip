import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Đăng ký" };

export default function Page() {
  return <Suspense><AuthForm mode="register" /></Suspense>;
}
