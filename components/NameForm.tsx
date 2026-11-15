"use client";

import { useActionState } from "react";
import { saveName } from "@/lib/actions";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

export function NameForm({ name }: { name: string }) {
  const [state, action] = useActionState(saveName, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <label htmlFor="name" className="text-sm text-neutral-400">
        Имя в отзывах и ленте
      </label>
      <input id="name" name="name" defaultValue={name} required maxLength={80} className="input w-56" />
      <SubmitButton className="btn-ghost">Сохранить</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
