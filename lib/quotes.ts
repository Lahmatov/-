import { db } from "./db";
import type { ImportedQuote } from "./importers";

// Цитаты: свои видны всегда, чужие — только публичные.

const withUser = { user: { select: { id: true, name: true } } } as const;

export type QuoteInput = { text: string; page: number | null; note: string | null; isPublic: boolean };

export function addQuote(userId: string, bookId: string, input: QuoteInput) {
  return db.quote.create({ data: { userId, bookId, ...input }, include: withUser });
}

/** Обновить свою цитату; null — если цитаты нет или она чужая. */
export async function updateQuote(userId: string, id: string, input: Partial<QuoteInput>) {
  const quote = await db.quote.findUnique({ where: { id } });
  if (!quote || quote.userId !== userId) return null;
  return db.quote.update({ where: { id }, data: input, include: withUser });
}

export async function deleteQuote(userId: string, id: string) {
  const { count } = await db.quote.deleteMany({ where: { id, userId } });
  return count > 0;
}

/** Цитаты к книге: сначала свои, потом публичные чужие. */
export async function bookQuotes(bookId: string, userId: string) {
  const [mine, others] = await Promise.all([
    db.quote.findMany({ where: { bookId, userId }, include: withUser, orderBy: [{ page: "asc" }, { createdAt: "asc" }] }),
    db.quote.findMany({
      where: { bookId, isPublic: true, userId: { not: userId } },
      include: withUser,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  return { mine, others };
}

/** Все мои цитаты, новые сверху. */
export function myQuotes(userId: string, cursor?: string, take = 50) {
  return db.quote.findMany({
    where: { userId },
    include: { ...withUser, book: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
}

/** Добавляет цитаты из импорта, пропуская уже сохранённые (повторный импорт Kindle не дублирует). */
export async function importQuotes(userId: string, bookId: string, quotes: ImportedQuote[]) {
  if (!quotes.length) return 0;
  const existing = new Set(
    (await db.quote.findMany({ where: { userId, bookId }, select: { text: true } })).map((q) => q.text),
  );
  const fresh = quotes.filter((q) => !existing.has(q.text));
  for (const q of fresh) await db.quote.create({ data: { userId, bookId, text: q.text, page: q.page, note: q.note } });
  return fresh.length;
}
