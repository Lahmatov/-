import type { Feed } from "../../api/models";

/** Следующая страница ленты; события, которые уже есть (лента сдвинулась), не дублируются. */
export function appendPage(existing: Feed, next: Feed): Feed {
  const seen = new Set(existing.items.map((i) => i.id));
  return { ...next, items: [...existing.items, ...next.items.filter((i) => !seen.has(i.id))] };
}

/** Люди из поиска без меня самого. */
export function otherPeople<T extends { id: string }>(people: T[], myId: string | null | undefined): T[] {
  return myId ? people.filter((p) => p.id !== myId) : people;
}

/** Удалить комментарий может его автор и автор отзыва. */
export function canDeleteComment(commentUserId: string, reviewAuthorId: string, myId: string | null | undefined): boolean {
  if (!myId) return false;
  return commentUserId === myId || reviewAuthorId === myId;
}
