import type { APIClient } from "../src/api/client";
import type { Book, Wrapped, YearStats } from "../src/api/models";
import { loadDiscover } from "../src/features/discover/loadDiscover";
import {
  formatAverage,
  importResultLines,
  monthLabel,
  parseGoal,
  peakMonth,
  statsSummary,
  wrappedFacts,
  wrappedShareText,
} from "../src/features/stats/statsLogic";
import { AppLanguage } from "../src/i18n";

afterEach(() => AppLanguage.setEnglish(false));

const book: Book = { id: "b1", title: "Мастер и Маргарита", author: "Михаил Булгаков", year: 1967, isbn: null, coverUrl: null, pageCount: 480 };

const stats = (over: Partial<YearStats> = {}): YearStats => ({
  year: 2026,
  goal: null,
  readCount: 12,
  byMonth: [1, 0, 3, 3, 0, 0, 0, 0, 0, 5, 0, 0],
  avgRating: 8.25,
  readingNow: 2,
  years: [2026, 2025],
  ...over,
});

const wrapped = (over: Partial<Wrapped> = {}): Wrapped => ({
  year: 2026,
  name: "Анна",
  booksRead: 21,
  pagesRead: 6400,
  avgRating: 8.5,
  topAuthor: { value: "Михаил Булгаков", count: 3 },
  topGenre: { slug: "classic", name: "Классика", count: 5 },
  bestBook: { book, rating: 10 },
  longestBook: null,
  busiestMonth: 2,
  byMonth: [],
  ...over,
});

test("stats summary with plural and goal", () => {
  expect(statsSummary(stats())).toBe("12 книг прочитано в 2026 году");
  expect(statsSummary(stats({ readCount: 1 }))).toBe("1 книга прочитана в 2026 году");
  expect(statsSummary(stats({ readCount: 3, goal: 3 }))).toBe("3 книги прочитано в 2026 году — цель выполнена!");
  AppLanguage.setEnglish(true);
  expect(statsSummary(stats({ readCount: 1 }))).toBe("1 book read in 2026");
});

test("goal parsing: empty removes, range 1...1000", () => {
  expect(parseGoal("  ")).toEqual({ ok: true, target: null });
  expect(parseGoal("24")).toEqual({ ok: true, target: 24 });
  expect(parseGoal("1000")).toEqual({ ok: true, target: 1000 });
  expect(parseGoal("0").ok).toBe(false);
  expect(parseGoal("1001").ok).toBe(false);
  expect(parseGoal("-3").ok).toBe(false);
  expect(parseGoal("2.5").ok).toBe(false);
});

test("peak month and labels", () => {
  expect(peakMonth([1, 0, 3, 3, 0, 0, 0, 0, 0, 5, 0, 0])).toBe(9);
  expect(peakMonth([0, 2, 2])).toBe(1);
  expect(peakMonth(Array(12).fill(0))).toBe(-1);
  expect(monthLabel(2, 3)).toMatch(/^Март: 3 книги$/);
  expect(formatAverage(8.25)).toBe("8.3");
  expect(formatAverage(null)).toBe("—");
});

test("wrapped facts: at most five, in Swift order", () => {
  const facts = wrappedFacts(wrapped());
  expect(facts).toHaveLength(5);
  expect(facts.map(([label]) => label)).toEqual(["страниц прочитано", "средняя оценка", "любимый автор", "любимый жанр", "лучшая книга"]);
  expect(facts[4]![1]).toBe("«Мастер и Маргарита» — 10/10");

  const few = wrappedFacts(wrapped({ pagesRead: 0, avgRating: null, topAuthor: null, topGenre: null, bestBook: null }));
  expect(few).toEqual([["самый книжный месяц", "март"]]);
  expect(wrappedFacts(wrapped({ pagesRead: 0, avgRating: null, topAuthor: null, topGenre: null, bestBook: null, busiestMonth: 12 }))).toEqual([]);
});

test("wrapped share text", () => {
  const text = wrappedShareText(wrapped({ pagesRead: 0, avgRating: null, topGenre: null, bestBook: null, busiestMonth: null }));
  expect(text).toBe("Итоги 2026\n21 книга прочитана\nлюбимый автор: Михаил Булгаков\nАнна · Книжная полка");
});

test("import result lines with plurals", () => {
  expect(importResultLines({ found: 5, added: 2 })).toEqual(["5 книг найдено", "2 добавлены на полку"]);
  expect(importResultLines({ found: 1, added: 1, quotes: 0 })).toEqual(["1 книга найдена", "1 добавлена на полку"]);
  expect(importResultLines({ found: 3, added: 0, quotes: 22 })).toEqual(["3 книги найдено", "0 добавлено на полку", "22 новые цитаты"]);
  AppLanguage.setEnglish(true);
  expect(importResultLines({ found: 1, added: 4, quotes: 2 })).toEqual(["1 book found", "4 added to shelf", "2 new quotes"]);
});

test("discover data: failing sections are hidden, empty genres filtered", async () => {
  const api = {
    recommendations: jest.fn().mockRejectedValue(new Error("offline")),
    top: jest.fn().mockResolvedValue({ top: [{ book, avgRating: 9, ratingsCount: 4 }], trending: [] }),
    genres: jest.fn().mockResolvedValue([
      { slug: "classic", name: "Классика", count: 3 },
      { slug: "poetry", name: "Поэзия", count: 0 },
    ]),
  } as unknown as APIClient;
  const data = await loadDiscover(api);
  expect(data.recommendations).toEqual([]);
  expect(data.top?.top).toHaveLength(1);
  expect(data.genres.map((g) => g.slug)).toEqual(["classic"]);
});
