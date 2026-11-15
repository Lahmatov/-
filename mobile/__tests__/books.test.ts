import type { ShelfEntry } from "../src/api/models";
import {
  dayKey,
  dayKeyToISO,
  daysInMonth,
  entryAfterReview,
  entryAfterStatus,
  isoToDayKey,
  monthGrid,
  parseDayKey,
  parsePageInput,
  parseYearInput,
  shiftMonth,
} from "../src/features/books/calendar";

const entry: ShelfEntry = {
  status: "WANT",
  startedAt: null,
  finishedAt: null,
  rating: 7,
  review: "Хорошо",
  isPublic: false,
  currentPage: 10,
  totalPages: 300,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("day keys", () => {
  expect(parseDayKey("2026-11-10")).toEqual({ year: 2026, month: 10, day: 10 });
  expect(parseDayKey("2026-02-30")).toBeNull();
  expect(parseDayKey("10.11.2026")).toBeNull();
  expect(dayKey(2026, 0, 5)).toBe("2026-01-05");
  expect(daysInMonth(2024, 1)).toBe(29);
  expect(daysInMonth(2026, 1)).toBe(28);
  expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
  expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
});

test("server dates are calendar days in UTC", () => {
  expect(isoToDayKey("2026-10-01T00:00:00.000Z")).toBe("2026-10-01");
  expect(isoToDayKey("2026-10-01T23:30:00.000Z")).toBe("2026-10-01");
  expect(isoToDayKey(null)).toBeNull();
  expect(dayKeyToISO("2026-10-01")).toBe("2026-10-01T00:00:00.000Z");
  expect(dayKeyToISO(null)).toBeNull();
});

test("month grid starts on the right weekday", () => {
  // 1 ноября 2026 — воскресенье.
  const mondayFirst = monthGrid({ year: 2026, month: 10 }, 1);
  expect(mondayFirst[0]).toEqual([null, null, null, null, null, null, 1]);
  expect(mondayFirst.every((w) => w.length === 7)).toBe(true);
  expect(mondayFirst.flat().filter((d) => d != null)).toHaveLength(30);
  const sundayFirst = monthGrid({ year: 2026, month: 10 }, 0);
  expect(sundayFirst[0]?.[0]).toBe(1);
});

test("offline status change mirrors the server", () => {
  const now = new Date("2026-11-10T15:00:00.000Z");
  const reading = entryAfterStatus(entry, "READING", now);
  expect(reading.status).toBe("READING");
  expect(reading.startedAt).toBe("2026-11-10T00:00:00.000Z");
  expect(reading.finishedAt).toBeNull();
  expect(reading.rating).toBe(7);
  expect(reading.isPublic).toBe(false);

  const read = entryAfterStatus(reading, "READ", now);
  expect(read.startedAt).toBe("2026-11-10T00:00:00.000Z");
  expect(read.finishedAt).toBe("2026-11-10T00:00:00.000Z");

  const fresh = entryAfterStatus(null, "WANT", now);
  expect(fresh).toMatchObject({ status: "WANT", startedAt: null, finishedAt: null, rating: null, isPublic: true });
});

test("offline review save", () => {
  const updated = entryAfterReview(entry, { rating: null, review: null, isPublic: true, startedAt: "2026-03-01", finishedAt: null });
  expect(updated).toMatchObject({ status: "WANT", rating: null, review: null, isPublic: true, startedAt: "2026-03-01T00:00:00.000Z", finishedAt: null, currentPage: 10 });
});

test("form inputs", () => {
  expect(parsePageInput(" 120 ")).toBe(120);
  expect(parsePageInput("")).toBeNull();
  expect(parsePageInput("12a")).toBeNull();
  expect(parseYearInput("")).toBeNull();
  expect(parseYearInput("1928")).toBe(1928);
  expect(parseYearInput("19x")).toBeUndefined();
});
