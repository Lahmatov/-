import Link from "next/link";
import { verifyEmail } from "@/lib/account";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const ok = token ? await verifyEmail(token) : false;
  return (
    <div className="mx-auto max-w-sm space-y-4 py-10 text-center">
      <h1 className="text-2xl font-bold">{ok ? "Email подтверждён" : "Ссылка не работает"}</h1>
      <p className="text-neutral-400">
        {ok
          ? "Спасибо! Теперь, если забудете пароль, сможете восстановить его по почте."
          : "Ссылка устарела или уже использована. Отправить новое письмо можно из профиля."}
      </p>
      <Link href="/" className="btn-primary">
        На главную
      </Link>
    </div>
  );
}
