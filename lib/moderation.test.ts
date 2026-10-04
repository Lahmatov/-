import { test } from "node:test";
import assert from "node:assert/strict";
import { isAdminEmail, isReportReason } from "./moderation";

test("модераторы — только из ADMIN_EMAILS, без учёта регистра", () => {
  process.env.ADMIN_EMAILS = "Boss@Example.com, mod@example.com";
  assert.equal(isAdminEmail("boss@example.com"), true);
  assert.equal(isAdminEmail("mod@example.com"), true);
  assert.equal(isAdminEmail("user@example.com"), false);
  assert.equal(isAdminEmail(null), false);
});

test("причины жалоб", () => {
  assert.equal(isReportReason("SPAM"), true);
  assert.equal(isReportReason("toString"), false);
});
