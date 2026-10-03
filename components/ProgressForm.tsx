"use client";

import { useActionState } from "react";
import { saveProgress } from "@/lib/actions";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

export function ProgressForm(props: { bookId: string; currentPage: number | null; totalPages: number | null }) {
  const [state, action] = useActionState(saveProgress.bind(null, props.bookId), undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-neutral-400">Страница</span>
      <input
        name="currentPage"
        type="number"
        min={0}
        inputMode="numeric"
        defaultValue={props.currentPage ?? ""}
        className="input w-24 py-1"
        aria-label="Текущая страница"
      />
      <span className="text-neutral-400">из</span>
      <input
        name="totalPages"
        type="number"
        min={1}
        inputMode="numeric"
        defaultValue={props.totalPages ?? ""}
        placeholder="?"
        className="input w-24 py-1"
        aria-label="Всего страниц"
      />
      <SubmitButton className="btn-ghost py-1">Сохранить</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
