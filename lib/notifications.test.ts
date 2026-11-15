import { test } from "node:test";
import assert from "node:assert/strict";
import { notificationText } from "./notifications";

test("тексты уведомлений без угадывания рода", () => {
  assert.equal(notificationText("FOLLOW", "Аня"), "Аня — новый подписчик");
  assert.equal(notificationText("LIKE", "Аня", "Дюна"), "Аня: ♥ вашему отзыву на «Дюна»");
  assert.equal(notificationText("COMMENT", "Борис"), "Борис: новый комментарий к отзыву");
});

test("английские тексты уведомлений", () => {
  assert.equal(notificationText("FOLLOW", "Anna", null, "en"), "Anna started following you");
  assert.equal(notificationText("LIKE", "Bob", "Dune", "en"), "Bob liked your review of “Dune”");
});
