import { redirect } from "next/navigation";
import { auth, googleEnabled } from "@/auth";
import { RegisterForm } from "@/components/AuthForms";

export default async function RegisterPage() {
  if (await auth()) redirect("/");
  return <RegisterForm googleEnabled={googleEnabled} />;
}
