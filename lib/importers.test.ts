import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBooksCsv, parseCsv, parseKindleClippings } from "./importers";

test("Kindle: книги из заметок без повторов", () => {
  const text = "﻿Dune (Frank Herbert)\n- Highlight\n\nSpice\n==========\nDune (Frank Herbert)\n- Note\n\nx\n==========\n";
  assert.deepEqual(parseKindleClippings(text), [
    { title: "Dune", author: "Frank Herbert", status: "READING", quotes: [{ text: "Spice", page: null, note: "x" }] },
  ]);
});

test("Kindle: выделения со страницами, повторы и закладки", () => {
  const text = [
    "Мастер и Маргарита (Булгаков М.)",
    "- Ваш выделенный отрывок на странице 12 | Место 180-182 | Добавлено: суббота, 3 октября 2026 г.",
    "",
    "Никогда и ничего не просите!",
    "==========",
    "Мастер и Маргарита (Булгаков М.)",
    "- Your Highlight on page 12 | Location 180-182 | Added on Saturday",
    "",
    "Никогда и ничего не просите!",
    "==========",
    "Мастер и Маргарита (Булгаков М.)",
    "- Ваша закладка на странице 40 | Место 600",
    "",
    "",
    "==========",
    "Dune (Frank Herbert)",
    "- Your Highlight at location 100-101 | Added on Monday",
    "",
    "Fear is the mind-killer.",
    "==========",
  ].join("\r\n");
  const [master, dune] = parseKindleClippings(text);
  assert.deepEqual(master.quotes, [{ text: "Никогда и ничего не просите!", page: 12, note: null }]);
  assert.deepEqual(dune.quotes, [{ text: "Fear is the mind-killer.", page: null, note: null }]);
});

test("CSV с кавычками и переносами строк", () => {
  assert.deepEqual(parseCsv('a,"b, c","d ""q"""\n1,"line\nbreak",3'), [
    ["a", "b, c", 'd "q"'],
    ["1", "line\nbreak", "3"],
  ]);
});

test("Goodreads: полки, оценка ×2, дата прочтения", () => {
  const csv =
    "Title,Author,My Rating,Original Publication Year,Date Read,Exclusive Shelf,My Review\n" +
    'Dune,Frank Herbert,5,1965,2024/05/01,read,"Great<br/>book"\n' +
    "Solaris,Stanisław Lem,0,1961,,to-read,\n";
  const [dune, solaris] = parseBooksCsv(csv);
  assert.equal(dune.status, "READ");
  assert.equal(dune.rating, 10);
  assert.equal(dune.review, "Great\nbook");
  assert.equal(dune.finishedAt?.getUTCFullYear(), 2024);
  assert.equal(solaris.status, "WANT");
  assert.equal(solaris.rating, null);
});
