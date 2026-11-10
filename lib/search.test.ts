import { test } from "node:test";
import assert from "node:assert/strict";
import { candidateFragments, editDistance, scoreBook, tokenize, wordScore } from "./search";

const book = (title: string, author: string, popularity = 0) => ({ title, author, popularity });

test("tokenize убирает пунктуацию и ё", () => {
  assert.deepEqual(tokenize("Москва — Петушки, Ерофеев!"), ["москва", "петушки", "ерофеев"]);
  assert.deepEqual(tokenize("Ёжик"), ["ежик"]);
});

test("editDistance учитывает перестановку соседних букв", () => {
  assert.equal(editDistance("булгкаов", "булгаков"), 1);
  assert.equal(editDistance("толстой", "толстой"), 0);
  assert.equal(editDistance("кот", "кит"), 1);
});

test("wordScore: точное > префикс > подстрока > опечатка", () => {
  const exact = wordScore("дюна", "дюна");
  const prefix = wordScore("мастер", "мастера");
  const inner = wordScore("гарит", "маргарита");
  const typo = wordScore("булгкаов", "булгаков");
  assert.ok(exact > prefix && prefix > inner && inner > typo && typo > 0);
  assert.equal(wordScore("кот", "кит"), 0, "в коротких словах опечатки не прощаем");
});

test("находит книгу с опечатками в авторе и названии", () => {
  assert.ok(scoreBook("булгкаов", book("Мастер и Маргарита", "Михаил Булгаков")) > 0);
  assert.ok(scoreBook("мастер и маргорита", book("Мастер и Маргарита", "Михаил Булгаков")) > 0);
  assert.ok(scoreBook("достоевски идиот", book("Идиот", "Фёдор Достоевский")) > 0);
});

test("не находит то, чего нет", () => {
  assert.equal(scoreBook("гарри поттер", book("Мастер и Маргарита", "Михаил Булгаков")), 0);
});

test("точное название выше, чем совпадение в середине", () => {
  const exact = scoreBook("дюна", book("Дюна", "Фрэнк Герберт"));
  const partial = scoreBook("дюна", book("Дети Дюны", "Фрэнк Герберт"));
  assert.ok(exact > partial);
});

test("при равном совпадении популярная книга выше", () => {
  assert.ok(scoreBook("оно", book("Оно", "Стивен Кинг", 50)) > scoreBook("оно", book("Оно", "Стивен Кинг", 0)));
});

test("candidateFragments берёт начало и конец длинных слов", () => {
  assert.deepEqual(candidateFragments("булгкаов"), ["бул", "аов"]);
  assert.deepEqual(candidateFragments("оно"), ["оно"]);
});
