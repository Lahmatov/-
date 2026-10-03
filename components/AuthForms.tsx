"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, loginWithGoogle, register } from "@/lib/actions";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

function GoogleButton({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return (
    <form action={loginWithGoogle}>
      <SubmitButton className="btn-ghost w-full">Войти через Google</SubmitButton>
    </form>
  );
}

function Divider({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return <div className="my-4 text-center text-xs uppercase text-neutral-500">или по email</div>;
}

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, action] = useActionState(login, undefined);
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">Вход</h1>
      <GoogleButton enabled={googleEnabled} />
      <Divider enabled={googleEnabled} />
      <form action={action} className="space-y-3">
        <input name="email" type="email" required placeholder="Email" className="input" autoComplete="email" />
        <input name="password" type="password" required placeholder="Пароль" className="input" autoComplete="current-password" />
        <FormMessage state={state} />
        <SubmitButton className="btn-primary w-full">Войти</SubmitButton>
      </form>
      <p className="mt-4 text-sm text-neutral-400">
        Нет аккаунта?{" "}
        <Link href="/register" className="text-amber-400 hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </div>
  );
}

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, action] = useActionState(register, undefined);
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">Регистрация</h1>
      <GoogleButton enabled={googleEnabled} />
      <Divider enabled={googleEnabled} />
      <form action={action} className="space-y-3">
        <input name="name" required placeholder="Имя" className="input" autoComplete="name" />
        <input name="email" type="email" required placeholder="Email" className="input" autoComplete="email" />
        <input name="password" type="password" required minLength={8} placeholder="Пароль (от 8 символов)" className="input" autoComplete="new-password" />
        <FormMessage state={state} />
        <SubmitButton className="btn-primary w-full">Создать аккаунт</SubmitButton>
      </form>
      <p className="mt-4 text-sm text-neutral-400">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="text-amber-400 hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
}
