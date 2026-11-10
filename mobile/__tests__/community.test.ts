import type { ClubDetails, Shelf, ShelfEntry, Book } from "../src/api/models";
import { AppLanguage } from "../src/i18n";
import { booksCount, challengeInviteText, challengeSummary, participantsCount } from "../src/features/challenges/challengeText";
import { addMonths, compareDays, dayToString, daysInMonth, shiftDay, today } from "../src/features/challenges/days";
import { clubBookChoices, clubInviteText, memberChapterTitle, myChapterTitle, postChapterOptions } from "../src/features/clubs/clubText";
import { quoteShareText } from "../src/features/quotes/quoteActions";

afterEach(() => AppLanguage.setEnglish(false));

const book = (id: string, patch: Partial<Book> = {}): Book => ({
  id,
  title: `Книга ${id}`,
  author: "Автор",
  year: null,
  isbn: null,
  coverUrl: null,
  pageCount: null,
  ...patch,
});

const entry = (status: ShelfEntry["status"]): ShelfEntry => ({
  status,
  startedAt: null,
  finishedAt: null,
  rating: null,
  review: null,
  isPublic: true,
  currentPage: null,
  totalPages: null,
  updatedAt: "2026-10-01T10:00:00.000Z",
});

describe("days", () => {
  test("month lengths and leap years", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  test("addMonths clamps to the end of month and crosses years", () => {
    expect(addMonths({ year: 2026, month: 11, day: 30 }, 3)).toEqual({ year: 2027, month: 2, day: 28 });
    expect(addMonths({ year: 2026, month: 1, day: 15 }, -1)).toEqual({ year: 2025, month: 12, day: 15 });
  });

  test("shiftDay wraps day and month, clamps day to month length", () => {
    expect(shiftDay({ year: 2026, month: 1, day: 31 }, "day", 1)).toEqual({ year: 2026, month: 1, day: 1 });
    expect(shiftDay({ year: 2026, month: 1, day: 1 }, "day", -1)).toEqual({ year: 2026, month: 1, day: 31 });
    expect(shiftDay({ year: 2026, month: 12, day: 5 }, "month", 1)).toEqual({ year: 2026, month: 1, day: 5 });
    expect(shiftDay({ year: 2026, month: 1, day: 31 }, "month", 1)).toEqual({ year: 2026, month: 2, day: 28 });
    expect(shiftDay({ year: 2028, month: 2, day: 29 }, "year", 1)).toEqual({ year: 2029, month: 2, day: 28 });
  });

  test("comparison, formatting and today", () => {
    expect(compareDays({ year: 2026, month: 3, day: 1 }, { year: 2026, month: 2, day: 28 })).toBeGreaterThan(0);
    expect(compareDays({ year: 2026, month: 3, day: 1 }, { year: 2026, month: 3, day: 1 })).toBe(0);
    expect(dayToString({ year: 2026, month: 3, day: 7 })).toBe("2026-03-07");
    expect(today(new Date(2026, 10, 10, 23, 30))).toEqual({ year: 2026, month: 11, day: 10 });
  });
});

describe("challenge text", () => {
  test("russian plurals", () => {
    expect(booksCount(1)).toBe("1 книга");
    expect(booksCount(3)).toBe("3 книги");
    expect(booksCount(10)).toBe("10 книг");
    expect(participantsCount(2)).toBe("2 участника");
    expect(participantsCount(11)).toBe("11 участников");
  });

  test("summary includes genre and period", () => {
    const summary = challengeSummary({ goal: 5, genre: { slug: "sf", name: "Фантастика" }, startsAt: "2026-06-01T00:00:00.000Z", endsAt: "2026-08-31T00:00:00.000Z" });
    expect(summary.startsWith("5 книг в жанре «Фантастика» · ")).toBe(true);
    expect(summary).toContain(" — ");
  });

  test("invite text has the code only for private challenges", () => {
    expect(challengeInviteText({ title: "Лето", isPublic: true }, "AB3DEF9K")).not.toContain("AB3DEF9K");
    expect(challengeInviteText({ title: "Лето", isPublic: false }, "AB3DEF9K")).toContain("AB3DEF9K");
  });

  test("english", () => {
    AppLanguage.setEnglish(true);
    expect(booksCount(1)).toBe("1 book");
    expect(booksCount(3)).toBe("3 books");
  });
});

describe("clubs", () => {
  test("chapter titles", () => {
    expect(myChapterTitle(0)).toBe("Ещё не начал");
    expect(myChapterTitle(4)).toBe("Дочитал до главы 4");
    expect(memberChapterTitle(0)).toBe("не начал");
    expect(memberChapterTitle(2)).toBe("гл. 2");
  });

  test("post chapter options start with the general topic", () => {
    expect(postChapterOptions({ min: 1, max: 3 })).toEqual([0, 1, 2, 3]);
  });

  test("invite text contains the code", () => {
    const club = { name: "Клуб", inviteCode: "XYZ12345" } as Pick<ClubDetails, "name" | "inviteCode">;
    expect(clubInviteText(club)).toContain("XYZ12345");
    expect(clubInviteText(club)).toContain("«Клуб»");
  });

  test("book choices: reading and want-to-read first", () => {
    const shelf: Shelf = {
      counts: {},
      items: [
        { book: book("read"), entry: entry("READ") },
        { book: book("want"), entry: entry("WANT") },
        { book: book("reading"), entry: entry("READING") },
      ],
    };
    expect(clubBookChoices(shelf).map((b) => b.id)).toEqual(["reading", "want", "read"]);
  });
});

describe("quotes", () => {
  test("share text with book and page", () => {
    expect(quoteShareText({ text: "Рукописи не горят", page: 245 }, { title: "Мастер и Маргарита", author: "Михаил Булгаков" })).toBe(
      "«Рукописи не горят»\n— Мастер и Маргарита, Михаил Булгаков, стр. 245",
    );
    expect(quoteShareText({ text: "Текст", page: null }, null)).toBe("«Текст»");
  });
});
