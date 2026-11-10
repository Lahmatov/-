import { dayString, formatDay, parseDate } from "../src/api/dates";
import { normalizeISBN } from "../src/api/isbn";
import {
  bookAuthors,
  bookSubtitle,
  challengeCompleted,
  challengeFraction,
  clubChapterRange,
  entryProgress,
  feedLabel,
  statusActions,
  type ClubDetails,
  type FeedItem,
  type ShelfEntry,
} from "../src/api/models";

const entry = (patch: Partial<ShelfEntry> = {}): ShelfEntry => ({
  status: "READING",
  startedAt: null,
  finishedAt: null,
  rating: null,
  review: null,
  isPublic: true,
  currentPage: null,
  totalPages: null,
  updatedAt: "2026-10-01T10:00:00.000Z",
  ...patch,
});

test("status actions follow the reading flow", () => {
  expect(statusActions(null).map((a) => a.target)).toEqual(["READING", "WANT", "READ"]);
  expect(statusActions("READING").map((a) => a.target)).toEqual(["READ", "PAUSED", "DROPPED"]);
  expect(statusActions("READ").map((a) => a.target)).toEqual(["READING"]);
});

test("progress uses the reader's edition first", () => {
  expect(entryProgress(entry({ currentPage: 50 }), 200)).toBe(0.25);
  expect(entryProgress(entry({ currentPage: 50, totalPages: 100 }), 200)).toBe(0.5);
  expect(entryProgress(entry({ currentPage: 500 }), 200)).toBe(1);
  expect(entryProgress(entry({ currentPage: 50 }), null)).toBeNull();
  expect(entryProgress(entry(), 200)).toBeNull();
});

test("book helpers", () => {
  expect(bookSubtitle({ author: "Булгаков", year: 1967 })).toBe("Булгаков · 1967");
  expect(bookSubtitle({ author: "Булгаков", year: null })).toBe("Булгаков");
  expect(bookAuthors({ author: "Илья Ильф,  Евгений Петров, " })).toEqual(["Илья Ильф", "Евгений Петров"]);
});

test("isbn normalization matches the server", () => {
  expect(normalizeISBN("978-5-17-090630-7")).toBe("9785170906307");
  expect(normalizeISBN("ISBN 5-17-090630-0")).toBeNull();
  expect(normalizeISBN("0-306-40615-2")).toBe("9780306406157");
  expect(normalizeISBN("080442957X")).toBe("9780804429573");
  expect(normalizeISBN("9785170906308")).toBeNull();
  expect(normalizeISBN("12345")).toBeNull();
});

test("calendar days are UTC", () => {
  const date = parseDate("2026-09-20T00:00:00.000Z")!;
  expect(dayString(date)).toBe("2026-09-20");
  expect(parseDate("nonsense")).toBeNull();
  expect(formatDay("2026-09-20T00:00:00.000Z")).toMatch(/20/);
});

test("challenge and club helpers", () => {
  expect(challengeFraction({ myProgress: 3, goal: 12 })).toBe(0.25);
  expect(challengeFraction({ myProgress: null, goal: 0 })).toBe(0);
  expect(challengeCompleted({ myProgress: 12, goal: 12 })).toBe(true);
  const club = { chapters: null, members: [{ chapter: 25 }] } as unknown as ClubDetails;
  expect(clubChapterRange(club)).toEqual({ min: 1, max: 35 });
  expect(clubChapterRange({ ...club, chapters: 12 })).toEqual({ min: 1, max: 12 });
});

test("feed labels avoid gendered verbs", () => {
  const item = { type: "STATUS", status: "READ", review: null } as FeedItem;
  expect(feedLabel(item)).toBe("прочитано");
  expect(feedLabel({ ...item, type: "REVIEW", review: "Отлично" })).toBe("отзыв");
  expect(feedLabel({ ...item, type: "REVIEW", review: null })).toBe("оценка");
});
