import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "./export";
import { parseBooksCsv } from "./importers";

const row = {
  title: "Двенадцать стульев",
  author: "Илья Ильф, Евгений Петров",
  year: 1928,
  isbn: null,
  status: "READ",
  rating: 9,
  review: 'Смешно.\nОчень "смешно"',
  startedAt: new Date("2026-01-02T00:00:00Z"),
  finishedAt: new Date("2026-02-03T00:00:00Z"),
  pages: 400,
  currentPage: null,
  isPublic: true,
};

test("экспорт читается нашим импортом обратно", () => {
  const [back] = parseBooksCsv(toCsv([row]));
  assert.equal(back.title, row.title);
  assert.equal(back.author, row.author, "запятая в авторе не ломает колонки");
  assert.equal(back.year, 1928);
  assert.equal(back.status, "READ");
  assert.equal(back.rating, 9, "оценка 1–10 не умножается, как у Goodreads");
  assert.equal(back.review, row.review, "переносы и кавычки сохраняются");
  assert.equal(back.finishedAt?.toISOString().slice(0, 10), "2026-02-03");
});

test("формулы в ячейках обезврежены", () => {
  const csv = toCsv([{ ...row, title: "=HYPERLINK(\"x\")", review: null }]);
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`));
});
