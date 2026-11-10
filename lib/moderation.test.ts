import { test } from "node:test";
import assert from "node:assert/strict";
import { isAdminEmail, isAdminUser, isReportReason } from "./moderation";

test("модераторы — только из ADMIN_EMAILS, без учёта регистра", () => {
  process.env.ADMIN_EMAILS = "Boss@Example.com, mod@example.com";
  assert.equal(isAdminEmail("boss@example.com"), true);
  assert.equal(isAdminEmail("mod@example.com"), true);
  assert.equal(isAdminEmail("user@example.com"), false);
  assert.equal(isAdminEmail(null), false);
});

test("модератор — только с подтверждённым email из ADMIN_EMAILS", () => {
  process.env.ADMIN_EMAILS = "boss@example.com";
  const verified = new Date();
  assert.equal(isAdminUser({ email: "boss@example.com", emailVerified: verified }), true);
  assert.equal(isAdminUser({ email: "Boss@Example.com", emailVerified: verified }), true);
  // Кто-то зарегистрировался с адресом модератора, но не подтвердил его.
  assert.equal(isAdminUser({ email: "boss@example.com", emailVerified: null }), false);
  assert.equal(isAdminUser({ email: "user@example.com", emailVerified: verified }), false);
  assert.equal(isAdminUser({ email: null, emailVerified: verified }), false);
  assert.equal(isAdminUser(null), false);
});

test("причины жалоб", () => {
  assert.equal(isReportReason("SPAM"), true);
  assert.equal(isReportReason("toString"), false);
});
