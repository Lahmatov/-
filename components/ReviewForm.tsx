"use client";

import { useActionState, useState } from "react";
import { saveReview } from "@/lib/actions";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

type Entry = {
  rating: number | null;
  review: string | null;
  isPublic: boolean;
  startedAt: string;
  finishedAt: string;
};

export function ReviewForm({ bookId, entry }: { bookId: string; entry: Entry }) {
  const [state, action] = useActionState(saveReview.bind(null, bookId), undefined);
  const [rating, setRating] = useState(entry.rating ?? 0);
  const [hover, setHover] = useState(0);

  return (
    <form action={action} className="space-y-4">
      <div>
        <span className="label">Моя оценка</span>
        <input type="hidden" name="rating" value={rating || ""} />
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} из 10`}
              onClick={() => setRating(n === rating ? 0 : n)}
              onMouseEnter={() => setHover(n)}
              className={`text-2xl leading-none ${n <= (hover || rating) ? "text-amber-400" : "text-neutral-700"}`}
            >
              ★
            </button>
          ))}
          {rating > 0 && <span className="ml-2 self-center text-sm text-neutral-400">{rating}/10</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="startedAt">Начал</label>
          <input id="startedAt" name="startedAt" type="date" defaultValue={entry.startedAt} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="finishedAt">Закончил</label>
          <input id="finishedAt" name="finishedAt" type="date" defaultValue={entry.finishedAt} className="input" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="review">Отзыв</label>
        <textarea id="review" name="review" rows={5} defaultValue={entry.review ?? ""} className="input" placeholder="Что думаете о книге?" />
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-300">
        <input type="checkbox" name="isPublic" defaultChecked={entry.isPublic} className="accent-amber-500" />
        Показывать другим — в профиле, ленте и отзывах
      </label>

      <div className="flex items-center gap-4">
        <SubmitButton>Сохранить</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
