export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="mt-1 flex items-center gap-2">
      <div
        className="h-1.5 w-32 overflow-hidden rounded-full bg-neutral-800"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Прочитано"
      >
        <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-neutral-500">{label ?? `${pct}%`}</span>
    </div>
  );
}
