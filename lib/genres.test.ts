import { test } from "node:test";
import assert from "node:assert/strict";
import { genresFromSubjects, isGenre } from "./genres";

test("жанры из тем Open Library", () => {
  assert.deepEqual(genresFromSubjects(["Fiction", "Science Fiction", "Dune (Imaginary place)"]), ["science-fiction"]);
  assert.deepEqual(genresFromSubjects(["Fantasy fiction", "Adventure stories"]), ["fantasy", "adventure"]);
  assert.deepEqual(genresFromSubjects(["Detective and mystery stories"]), ["detective"]);
  assert.deepEqual(genresFromSubjects(["Fiction", "Russia"]), []);
});

test("isGenre принимает только известные слаги", () => {
  assert.equal(isGenre("fantasy"), true);
  assert.equal(isGenre("drop table"), false);
});
