import { test } from "node:test";
import assert from "node:assert/strict";
import { splitAuthors, weightedRating } from "./discover";

test("splitAuthors делит соавторов по запятой", () => {
  assert.deepEqual(splitAuthors("Илья Ильф, Евгений Петров"), ["Илья Ильф", "Евгений Петров"]);
  assert.deepEqual(splitAuthors("Аркадий и Борис Стругацкие"), ["Аркадий и Борис Стругацкие"]);
});

test("взвешенная оценка: одна десятка не обгоняет много девяток", () => {
  const oneTen = weightedRating(10, 1, 7);
  const manyNines = weightedRating(9, 100, 7);
  assert.ok(manyNines > oneTen);
  assert.ok(Math.abs(weightedRating(8, 1_000_000, 7) - 8) < 0.01);
});
