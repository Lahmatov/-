import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clientIp,
  isLoginLimited,
  isRateLimited,
  loginKeys,
  recordFailure,
  recordLoginFailure,
  recordLoginSuccess,
  resetAttempts,
} from "./rate-limit";

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

test("чужой IP не блокирует вход по тому же email", () => {
  const attacker = loginKeys("10.0.0.1", "victim@example.com");
  const victim = loginKeys("10.0.0.2", "victim@example.com");
  for (let i = 0; i < 10; i++) recordLoginFailure(attacker);
  assert.equal(isLoginLimited(attacker), true);
  assert.equal(isLoginLimited(victim), false);
});

test("перебор многих email с одного IP упирается в лимит IP", () => {
  for (let i = 0; i < 30; i++) recordLoginFailure(loginKeys("10.0.0.3", `user${i}@example.com`));
  assert.equal(isLoginLimited(loginKeys("10.0.0.3", "new@example.com")), true);
});

test("успешный вход не обнуляет лимит IP", () => {
  for (let i = 0; i < 30; i++) recordLoginFailure(loginKeys("10.0.0.4", `spray${i}@example.com`));
  recordLoginSuccess(loginKeys("10.0.0.4", "me@example.com"));
  assert.equal(isLoginLimited(loginKeys("10.0.0.4", "other@example.com")), true);
});

test("clientIp берёт адрес, добавленный ближайшим прокси", () => {
  const req = { headers: new Headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" }) };
  assert.equal(clientIp(req), "203.0.113.9");
  assert.equal(clientIp({ headers: new Headers() }), "unknown");
});
