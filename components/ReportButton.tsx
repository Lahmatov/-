"use client";

import { useState, useTransition } from "react";
import { reportAction } from "@/lib/actions";

const REASONS: [string, string][] = [
  ["SPAM", "Спам или реклама"],
  ["ABUSE", "Оскорбления"],
  ["SPOILER", "Спойлер без предупреждения"],
  ["OTHER", "Другое"],
];

/** «Пожаловаться» с выбором причины. */
export function ReportButton({ entryId, commentId }: { entryId?: string; commentId?: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  if (sent) return <span className="text-xs text-neutral-500">Жалоба отправлена</span>;
  return (
    <span className="relative text-xs">
      <button type="button" onClick={() => setOpen(!open)} className="text-neutral-600 hover:text-neutral-300">
        пожаловаться
      </button>
      {open && (
        <span className="absolute right-0 z-10 mt-1 flex w-56 flex-col rounded-lg border border-neutral-700 bg-neutral-900 p-1 shadow-lg">
          {REASONS.map(([reason, label]) => (
            <button
              key={reason}
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await reportAction({ entryId, commentId }, reason);
                  setSent(true);
                })
              }
              className="rounded px-2 py-1.5 text-left hover:bg-neutral-800"
            >
              {label}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
