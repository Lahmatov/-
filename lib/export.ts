import { db } from "./db";

// Экспорт полки в CSV. Колонки совместимы с импортом (lib/importers.ts): файл можно загрузить обратно.

export type ExportRow = {
  title: string;
  author: string;
  year: number | null;
  isbn: string | null;
  status: string;
  rating: number | null;
  review: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  pages: number | null;
  currentPage: number | null;
  isPublic: boolean;
};

const HEADER = ["Title", "Author", "Year", "ISBN", "Status", "Rating", "Review", "Started", "Finished", "Pages", "Current Page", "Public"];

function cell(value: string | number | boolean | null): string {
  if (value === null) return "";
  let s = String(value);
  // Ячейка, начинающаяся с =, +, -, @, табуляции или CR, в Excel может выполниться как формула.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export function toCsv(rows: ExportRow[]): string {
  const lines = [HEADER.join(",")];
  for (const r of rows) {
    lines.push(
      [r.title, r.author, r.year, r.isbn, r.status, r.rating, r.review, day(r.startedAt), day(r.finishedAt), r.pages, r.currentPage, r.isPublic]
        .map(cell)
        .join(","),
    );
  }
  // BOM — чтобы Excel открыл кириллицу правильно.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export async function exportShelf(userId: string): Promise<string> {
  const entries = await db.shelfEntry.findMany({ where: { userId }, include: { book: true }, orderBy: { updatedAt: "desc" } });
  return toCsv(
    entries.map((e) => ({
      title: e.book.title,
      author: e.book.author,
      year: e.book.year,
      isbn: e.book.isbn,
      status: e.status,
      rating: e.rating,
      review: e.review,
      startedAt: e.startedAt,
      finishedAt: e.finishedAt,
      pages: e.totalPages ?? e.book.pageCount,
      currentPage: e.currentPage,
      isPublic: e.isPublic,
    })),
  );
}

export function csvResponse(csv: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookshelf-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
