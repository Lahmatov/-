import { db } from "./db";
import { candidateFragments, scoreBook, tokenize } from "./search";

export function normalize(text: string): string {
  return text.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

export function makeSearchText(title: string, author: string): string {
  return normalize(`${title} ${author}`);
}

/**
 * Поиск по локальному каталогу. Сначала точные совпадения подстрок; если их мало —
 * добираем кандидатов по кускам слов и прощаем опечатки. Результат отсортирован по релевантности.
 */
export async function searchBooks(query: string, take = 30) {
  const words = tokenize(query);
  if (words.length === 0) return [];
  const include = { _count: { select: { entries: true } } } as const;

  const exact = await db.book.findMany({
    where: { AND: words.map((w) => ({ searchText: { contains: w } })) },
    include,
    take: 200,
  });
  let candidates = exact;
  if (exact.length < take) {
    const fragments = candidateFragments(query);
    const fuzzy = await db.book.findMany({
      where: { OR: fragments.map((f) => ({ searchText: { contains: f } })), id: { notIn: exact.map((b) => b.id) } },
      include,
      take: 3000,
    });
    candidates = exact.concat(fuzzy);
  }

  return candidates
    .map((book) => ({ book, score: scoreBook(query, { ...book, popularity: book._count.entries }) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || (b.book.year ?? 0) - (a.book.year ?? 0))
    .slice(0, take)
    .map(({ book: { _count, ...book } }) => book);
}

/** Находит уже существующую книгу с тем же названием и автором. */
export async function findDuplicate(title: string, author: string) {
  return db.book.findFirst({ where: { searchText: makeSearchText(title, author) } });
}
