import type { ShelfItem } from "../src/api/models";
import { bookcaseSections, booksPerShelf, bookSeed, pagesRead } from "../src/features/bookcase/layout";

const item = (id: string, status: ShelfItem["entry"]["status"], finishedAt: string | null, pages: number | null = null): ShelfItem => ({
  book: { id, title: id, author: "A", year: null, isbn: null, coverUrl: null, pageCount: pages },
  entry: { status, startedAt: null, finishedAt, rating: null, review: null, isPublic: true, currentPage: null, totalPages: null, updatedAt: "2026-01-01T00:00:00.000Z" },
});

test("only read books, grouped by year, newest first, undated last", () => {
  const sections = bookcaseSections(
    [
      item("a", "READ", "2025-03-01T00:00:00.000Z"),
      item("b", "READ", "2026-05-01T00:00:00.000Z"),
      item("c", "READING", null),
      item("d", "READ", null),
      item("e", "READ", "2026-09-01T00:00:00.000Z"),
    ],
    10,
  );
  expect(sections.map((s) => s.year)).toEqual([2026, 2025, null]);
  expect(sections[0].rows[0].map((i) => i.book.id)).toEqual(["e", "b"]);
  expect(sections.reduce((n, s) => n + s.count, 0)).toBe(4);
});

test("books are split into shelves of the given size", () => {
  const books = Array.from({ length: 7 }, (_, i) => item(`b${i}`, "READ", `2026-01-0${i + 1}T00:00:00.000Z`));
  const [section] = bookcaseSections(books, 3);
  expect(section.rows.map((r) => r.length)).toEqual([3, 3, 1]);
});

test("shelf capacity, pages and stable seeds", () => {
  expect(booksPerShelf(340)).toBe(5);
  expect(booksPerShelf(100)).toBe(3);
  expect(pagesRead([item("a", "READ", null, 300), item("b", "WANT", null, 500)])).toBe(300);
  expect(bookSeed("x")).toBe(bookSeed("x"));
  expect(bookSeed("x")).toBeGreaterThanOrEqual(0);
  expect(bookSeed("x")).toBeLessThan(1);
});
