import Link from "next/link";
import { ResetPasswordForm } from "@/components/PasswordForms";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Новый пароль</h1>
      {token ? (
        <>
          <p className="text-sm text-neutral-400">После смены пароля вы выйдете из приложения на всех устройствах.</p>
          <ResetPasswordForm token={token} />
        </>
      ) : (
        <p className="text-neutral-400">
          В ссылке нет токена.{" "}
          <Link href="/forgot-password" className="text-amber-400 hover:underline">
            Запросите новую
          </Link>
          .
        </p>
      )}
    </div>
  );
}
