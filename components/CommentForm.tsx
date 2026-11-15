"use client";

import { useActionState, useEffect, useRef } from "react";
import { addCommentAction } from "@/lib/actions";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

export function CommentForm({ entryId, path }: { entryId: string; path: string }) {
  const [state, action] = useActionState(addCommentAction.bind(null, entryId, path), undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.message) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="flex items-start gap-2">
      <textarea name="text" rows={1} required maxLength={2000} placeholder="Комментарий…" className="input py-1 text-sm" />
      <SubmitButton className="btn-ghost py-1 text-sm">→</SubmitButton>
      {state?.error && <FormMessage state={state} />}
    </form>
  );
}
