import type { FormState } from "@/lib/actions";

export function FormMessage({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-red-400">{state.error}</p>;
  if (state?.message) return <p className="text-sm text-green-400">{state.message}</p>;
  return null;
}
