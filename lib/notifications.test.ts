import { test } from "node:test";
import assert from "node:assert/strict";
import { notificationText } from "./notifications";

test("тексты уведомлений без угадывания рода", () => {
  assert.equal(notificationText("FOLLOW", "Аня"), "Аня — новый подписчик");
  assert.equal(notificationText("LIKE", "Аня", "Дюна"), "Аня: ♥ вашему отзыву на «Дюна»");
  assert.equal(notificationText("COMMENT", "Борис"), "Борис: новый комментарий к отзыву");
});
