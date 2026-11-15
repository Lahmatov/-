import type { ShelfItem } from "../../api/models";

// Виртуальная книжная полка: прочитанные книги стоят на полках по годам, новые — первыми.

export type BookcaseSection = {
  /** Год окончания чтения; null — дата не указана. */
  year: number | null;
  count: number;
  /** Ряды полки: книги слева направо. */
  rows: ShelfItem[][];
};

/** Сколько книг помещается на одной полке при ширине ряда width (книга ~56 pt + промежуток). */
export function booksPerShelf(width: number): number {
  return Math.max(3, Math.floor((width + 6) / 62));
}

function finishedTime(item: ShelfItem): number | null {
  const value = item.entry.finishedAt ?? null;
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

/** Только прочитанные, по годам (новые годы сверху), внутри года — последняя прочитанная первой. */
export function bookcaseSections(items: ShelfItem[], perShelf: number): BookcaseSection[] {
  const read = items.filter((i) => i.entry.status === "READ");
  const byYear = new Map<number | null, ShelfItem[]>();
  for (const item of read) {
    const t = finishedTime(item);
    const year = t == null ? null : new Date(t).getUTCFullYear();
    const list = byYear.get(year) ?? [];
    list.push(item);
    byYear.set(year, list);
  }
  const years = [...byYear.keys()].sort((a, b) => (a == null ? 1 : b == null ? -1 : b - a));
  return years.map((year) => {
    const books = [...byYear.get(year)!].sort((a, b) => {
      const ta = finishedTime(a) ?? Date.parse(a.entry.updatedAt);
      const tb = finishedTime(b) ?? Date.parse(b.entry.updatedAt);
      return tb - ta;
    });
    const rows: ShelfItem[][] = [];
    for (let i = 0; i < books.length; i += perShelf) rows.push(books.slice(i, i + perShelf));
    return { year, count: books.length, rows };
  });
}

/** Сумма страниц прочитанных книг (издание читателя, иначе из каталога). */
export function pagesRead(items: ShelfItem[]): number {
  return items
    .filter((i) => i.entry.status === "READ")
    .reduce((sum, i) => sum + (i.entry.totalPages ?? i.book.pageCount ?? 0), 0);
}

/** Стабильное число 0..1 по id книги: от него зависят высота корешка и цвет книги без обложки. */
export function bookSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}
