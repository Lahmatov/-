"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPassword, resetPasswordAction } from "@/lib/actions";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPassword, undefined);
  return (
    <form action={action} className="space-y-3">
      <input name="email" type="email" required placeholder="Email" className="input" autoComplete="email" />
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full">Отправить ссылку</SubmitButton>
      <p className="text-sm text-neutral-400">
        <Link href="/login" className="text-amber-400 hover:underline">
          Вернуться ко входу
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction.bind(null, token), undefined);
  return (
    <form action={action} className="space-y-3">
      <input
        name="password"
        type="password"
        required
        minLength={8}
        placeholder="Новый пароль (от 8 символов)"
        className="input"
        autoComplete="new-password"
      />
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full">Сохранить пароль</SubmitButton>
    </form>
  );
}
