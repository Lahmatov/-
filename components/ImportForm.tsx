"use client";

import { useActionState } from "react";
import { importFile } from "@/lib/actions";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

export function ImportForm({ kind, accept }: { kind: "kindle" | "csv"; accept: string }) {
  const [state, action] = useActionState(importFile, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="kind" value={kind} />
      <input type="file" name="file" accept={accept} required className="text-sm text-neutral-300 file:btn-ghost file:mr-3" />
      <SubmitButton>Импортировать</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
