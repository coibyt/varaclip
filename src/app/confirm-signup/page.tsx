import { Suspense } from "react";
import { ConfirmSignup } from "@/components/password-forms";

export const metadata = { title: "VaraClip" };

export default function Page() {
  return <Suspense><ConfirmSignup /></Suspense>;
}
