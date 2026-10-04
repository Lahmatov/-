"use client";

import { useActionState } from "react";
import { addBook } from "@/lib/actions";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

export function NewBookForm({ defaultTitle }: { defaultTitle: string }) {
  const [state, action] = useActionState(addBook, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="title">Название</label>
        <input id="title" name="title" required defaultValue={defaultTitle} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="author">Автор</label>
        <input id="author" name="author" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="year">Год первой публикации</label>
        <input id="year" name="year" type="number" inputMode="numeric" className="input" />
      </div>
      <FormMessage state={state} />
      <SubmitButton>Добавить в каталог</SubmitButton>
    </form>
  );
}
