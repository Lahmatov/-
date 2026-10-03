import type { Status } from "./status";
import { isStatus } from "./status";

export type ImportedBook = {
  title: string;
  author: string;
  year?: number | null;
  status: Status;
  rating?: number | null; // 1..10
  review?: string | null;
  finishedAt?: Date | null;
};

/**
 * Kindle: файл documents/My Clippings.txt с устройства.
 * Каждая запись отделена строкой "==========", первая строка — "Название (Автор)".
 */
export function parseKindleClippings(text: string): ImportedBook[] {
  const seen = new Map<string, ImportedBook>();
  for (const block of text.replace(/^﻿/, "").split(/^==========\s*$/m)) {
    const header = block.trim().split(/\r?\n/)[0]?.replace(/^﻿/, "").trim();
    if (!header) continue;
    const m = header.match(/^(.*)\(([^()]*)\)\s*$/);
    const title = (m ? m[1] : header).trim();
    const author = (m ? m[2] : "").trim() || "Неизвестный автор";
    if (!title) continue;
    const key = `${title}|${author}`.toLowerCase();
    if (!seen.has(key)) seen.set(key, { title, author, status: "READING" });
  }
  return [...seen.values()];
}

/** Минимальный CSV-парсер с поддержкой кавычек и переносов строк внутри полей. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

const GOODREADS_SHELF: Record<string, Status> = {
  read: "READ",
  "currently-reading": "READING",
  "to-read": "WANT",
};

/**
 * CSV-экспорт Goodreads (My Books → Import and export) или простой CSV
 * с колонками Title, Author, Year, Status (WANT/READING/PAUSED/READ/DROPPED).
 */
export function parseBooksCsv(text: string): ImportedBook[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  const idx = (...names: string[]) => header.findIndex((h) => names.includes(h.trim().toLowerCase()));
  const col = {
    title: idx("title", "название"),
    author: idx("author", "автор"),
    year: idx("original publication year", "year published", "year", "год"),
    shelf: idx("exclusive shelf", "status", "статус"),
    rating: idx("my rating", "rating", "оценка"),
    review: idx("my review", "review", "отзыв"),
    dateRead: idx("date read", "finished", "дата прочтения"),
  };
  if (col.title < 0 || col.author < 0) throw new Error("В CSV нет колонок Title и Author");
  const isGoodreads = header.some((h) => h.trim().toLowerCase() === "exclusive shelf");

  const result: ImportedBook[] = [];
  for (const r of rows) {
    const get = (i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
    const title = get(col.title);
    const author = get(col.author);
    if (!title || !author) continue;

    const shelf = get(col.shelf);
    const status: Status = GOODREADS_SHELF[shelf.toLowerCase()] ?? (isStatus(shelf.toUpperCase()) ? (shelf.toUpperCase() as Status) : "READ");

    const rawRating = Number(get(col.rating));
    // Goodreads ставит оценки 1–5, у нас шкала 1–10.
    const rating = rawRating > 0 ? Math.min(10, Math.round(isGoodreads ? rawRating * 2 : rawRating)) : null;

    const year = Number(get(col.year));
    const dateRead = get(col.dateRead) ? new Date(get(col.dateRead).replace(/\//g, "-")) : null;

    result.push({
      title,
      author,
      year: Number.isInteger(year) && year !== 0 ? year : null,
      status,
      rating,
      review: get(col.review).replace(/<br\s*\/?>/gi, "\n") || null,
      finishedAt: dateRead && !Number.isNaN(dateRead.getTime()) ? dateRead : null,
    });
  }
  return result;
}
