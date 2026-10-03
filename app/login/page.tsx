import { redirect } from "next/navigation";
import { auth, googleEnabled } from "@/auth";
import { LoginForm } from "@/components/AuthForms";

const ERRORS: Record<string, string> = {
  OAuthAccountNotLinked: "Этот email уже зарегистрирован с паролем — войдите по email и паролю.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await auth()) redirect("/");
  const { error } = await searchParams;
  return (
    <>
      {error && (
        <p className="mx-auto mb-4 max-w-sm rounded-lg bg-red-950 p-3 text-sm text-red-300">
          {ERRORS[error] ?? "Не удалось войти. Попробуйте ещё раз."}
        </p>
      )}
      <LoginForm googleEnabled={googleEnabled} />
    </>
  );
}
