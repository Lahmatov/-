import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBooksCsv, parseCsv, parseKindleClippings } from "./importers";

test("Kindle: книги из заметок без повторов", () => {
  const text = "﻿Dune (Frank Herbert)\n- Highlight\n\nSpice\n==========\nDune (Frank Herbert)\n- Note\n\nx\n==========\n";
  assert.deepEqual(parseKindleClippings(text), [{ title: "Dune", author: "Frank Herbert", status: "READING" }]);
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
