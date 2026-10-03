import { test } from "node:test";
import assert from "node:assert/strict";
import { isRateLimited, recordFailure, resetAttempts } from "./rate-limit";

test("блокирует после лимита неудачных попыток и сбрасывается после успеха", () => {
  const key = "login:test@example.com";
  for (let i = 0; i < 3; i++) {
    assert.equal(isRateLimited(key, 3), false);
    recordFailure(key);
  }
  assert.equal(isRateLimited(key, 3), true);
  resetAttempts(key);
  assert.equal(isRateLimited(key, 3), false);
});
