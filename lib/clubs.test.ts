import { test } from "node:test";
import assert from "node:assert/strict";
import { isSpoiler, makeInviteCode, normalizeInviteCode } from "./clubs";

test("код приглашения: 8 символов без похожих букв и цифр", () => {
  for (let i = 0; i < 50; i++) assert.match(makeInviteCode(), /^[A-HJ-NP-Z2-9]{8}$/);
});

test("код приглашения нормализуется", () => {
  assert.equal(normalizeInviteCode(" ab3d-ef9k "), "AB3DEF9K");
});

test("спойлеры: глава дальше моей, кроме своих и общих", () => {
  const me = { userId: "me", chapter: 3 };
  assert.equal(isSpoiler({ chapter: 4, userId: "other" }, me), true);
  assert.equal(isSpoiler({ chapter: 3, userId: "other" }, me), false);
  assert.equal(isSpoiler({ chapter: null, userId: "other" }, me), false);
  assert.equal(isSpoiler({ chapter: 9, userId: "me" }, me), false);
});
