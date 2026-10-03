import { db } from "./db";

export function normalize(text: string): string {
  return text.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

export function makeSearchText(title: string, author: string): string {
  return normalize(`${title} ${author}`);
}

/** Поиск по локальному каталогу: каждое слово запроса должно встретиться в названии или авторе. */
export async function searchBooks(query: string, take = 30) {
  const words = normalize(query).split(" ").filter(Boolean);
  if (words.length === 0) return [];
  return db.book.findMany({
    where: { AND: words.map((w) => ({ searchText: { contains: w } })) },
    orderBy: [{ entries: { _count: "desc" } }, { year: "desc" }],
    take,
  });
}

/** Находит уже существующую книгу с тем же названием и автором. */
export async function findDuplicate(title: string, author: string) {
  return db.book.findFirst({ where: { searchText: makeSearchText(title, author) } });
}
