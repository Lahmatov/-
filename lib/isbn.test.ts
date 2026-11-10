import { test } from "node:test";
import assert from "node:assert/strict";
import { isbn13to10, normalizeIsbn } from "./isbn";

test("ISBN-13 со штрихкода и с дефисами", () => {
  assert.equal(normalizeIsbn("9780441013593"), "9780441013593");
  assert.equal(normalizeIsbn("978-0-441-01359-3"), "9780441013593");
  assert.equal(normalizeIsbn("ISBN 978-5-389-01686-6"), "9785389016866");
});

test("ISBN-10 переводится в ISBN-13, включая X", () => {
  assert.equal(normalizeIsbn("0441013597"), "9780441013593");
  assert.equal(normalizeIsbn("080442957X"), "9780804429573");
});

test("неверная контрольная цифра и не-ISBN", () => {
  assert.equal(normalizeIsbn("9780441013594"), null);
  assert.equal(normalizeIsbn("4600000000001"), null, "обычный EAN-13 товара — не книга");
  assert.equal(normalizeIsbn("мастер"), null);
});

test("обратное преобразование в ISBN-10", () => {
  assert.equal(isbn13to10("9780441013593"), "0441013597");
  assert.equal(isbn13to10("9780804429573"), "080442957X");
  assert.equal(isbn13to10("9791032305690"), null);
});
