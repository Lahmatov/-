"use client";

import { useActionState } from "react";
import { saveGoal } from "@/lib/actions";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

export function GoalForm({ year, goal }: { year: number; goal: number | null }) {
  const [state, action] = useActionState(saveGoal.bind(null, year), undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <label htmlFor="target" className="text-sm text-neutral-400">
        Цель на {year}:
      </label>
      <input
        id="target"
        name="target"
        type="number"
        min={1}
        max={1000}
        inputMode="numeric"
        defaultValue={goal ?? ""}
        placeholder="напр. 24"
        className="input w-28"
      />
      <SubmitButton className="btn-ghost">Сохранить</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
