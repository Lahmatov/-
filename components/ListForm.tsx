"use client";

import { useActionState } from "react";
import { createListAction, updateListAction } from "@/lib/actions";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

type Props =
  | { mode: "create"; bookId?: string }
  | { mode: "edit"; listId: string; title: string; description: string | null; isPublic: boolean };

export function ListForm(props: Props) {
  const [state, action] = useActionState(
    props.mode === "create" ? createListAction : updateListAction.bind(null, props.listId),
    undefined,
  );
  const edit = props.mode === "edit" ? props : null;
  return (
    <form action={action} className="space-y-3">
      {props.mode === "create" && props.bookId && <input type="hidden" name="bookId" value={props.bookId} />}
      <input name="title" required maxLength={120} defaultValue={edit?.title} placeholder="Название списка" className="input" />
      <textarea
        name="description"
        rows={2}
        maxLength={1000}
        defaultValue={edit?.description ?? ""}
        placeholder="Описание (необязательно)"
        className="input"
      />
      <label className="flex items-center gap-2 text-sm text-neutral-300">
        <input type="checkbox" name="isPublic" defaultChecked={edit?.isPublic ?? true} className="accent-amber-500" />
        Виден в моём профиле
      </label>
      <div className="flex items-center gap-3">
        <SubmitButton>{edit ? "Сохранить" : "Создать список"}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
