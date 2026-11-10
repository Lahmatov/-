import { dayString, parseDate } from "../../api/dates";
import type { ReadingStatus, ReviewUpdate, ShelfEntry } from "../../api/models";

// Календарные дни "YYYY-MM-DD" (UTC, как на сервере) для выбора дат начала и окончания чтения.

export type MonthRef = { year: number; month: number /** 0 — январь */ };

/** "2026-11-10" → { year: 2026, month: 10, day: 10 }; null, если строка не дата. */
export function parseDayKey(value: string): (MonthRef & { day: number }) | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (month < 0 || month > 11 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function dayKey(year: number, month: number, day: number): string {
  return dayString(new Date(Date.UTC(year, month, day)));
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function shiftMonth(ref: MonthRef, delta: number): MonthRef {
  const date = new Date(Date.UTC(ref.year, ref.month + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

/** Сетка месяца по неделям: числа дней и null для пустых клеток. firstWeekday: 0 — воскресенье, 1 — понедельник. */
export function monthGrid(ref: MonthRef, firstWeekday: 0 | 1): (number | null)[][] {
  const weekdayOfFirst = new Date(Date.UTC(ref.year, ref.month, 1)).getUTCDay();
  const offset = (weekdayOfFirst - firstWeekday + 7) % 7;
  const cells: (number | null)[] = Array.from({ length: offset }, () => null);
  const count = daysInMonth(ref.year, ref.month);
  for (let d = 1; d <= count; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** День из ISO-строки сервера ("2026-10-01T00:00:00.000Z" → "2026-10-01"). */
export function isoToDayKey(value: string | null | undefined): string | null {
  const date = parseDate(value);
  return date ? dayString(date) : null;
}

/** "2026-10-01" → ISO-строка, как её отдаёт сервер. */
export function dayKeyToISO(value: string | null): string | null {
  return value ? `${value}T00:00:00.000Z` : null;
}

/** Запись полки после смены статуса без сети — так же, как её обновит сервер. */
export function entryAfterStatus(old: ShelfEntry | null, status: ReadingStatus, now: Date = new Date()): ShelfEntry {
  const today = dayKeyToISO(dayString(now));
  return {
    status,
    startedAt: old?.startedAt ?? (status === "READING" ? today : null),
    finishedAt: status === "READ" ? today : old?.finishedAt ?? null,
    rating: old?.rating ?? null,
    review: old?.review ?? null,
    isPublic: old?.isPublic ?? true,
    currentPage: old?.currentPage ?? null,
    totalPages: old?.totalPages ?? null,
    updatedAt: now.toISOString(),
  };
}

/** Запись полки после сохранения оценки и отзыва без сети. */
export function entryAfterReview(old: ShelfEntry, update: ReviewUpdate, now: Date = new Date()): ShelfEntry {
  return {
    ...old,
    rating: update.rating,
    review: update.review,
    isPublic: update.isPublic,
    startedAt: dayKeyToISO(update.startedAt),
    finishedAt: dayKeyToISO(update.finishedAt),
    updatedAt: now.toISOString(),
  };
}

/** Число страниц из поля ввода: пусто или не число — null. */
export function parsePageInput(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

/** Год из поля формы: пусто — null (год не указан), не число — undefined (нельзя сохранить). */
export function parseYearInput(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return /^-?\d+$/.test(trimmed) ? Number(trimmed) : undefined;
}
