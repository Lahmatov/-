import { after, describe, test } from "node:test";
import assert from "node:assert/strict";
import Redis from "ioredis";
import {
  clientIp,
  isLoginLimited,
  isRateLimited,
  loginKeys,
  MemoryStore,
  RedisStore,
  recordFailure,
  recordLoginFailure,
  recordLoginSuccess,
  resetAttempts,
  setRateLimitStore,
} from "./rate-limit";

// Одни и те же проверки для хранилища в памяти и для Redis (если задан REDIS_URL, как в CI).
const redisUrl = process.env.REDIS_URL;
const redis = redisUrl ? new Redis(redisUrl) : null;
after(() => redis?.disconnect());

const stores: [string, () => MemoryStore | RedisStore][] = [["память", () => new MemoryStore()]];
if (redis) stores.push(["Redis", () => new RedisStore(redis)]);

for (const [name, makeStore] of stores) {
  describe(`ограничитель попыток (${name})`, () => {
    const run = `${Date.now()}-${Math.random()}`;
    const ip = (n: number) => `10.${n}.0.1-${run}`;

    test("блокирует после лимита неудачных попыток и сбрасывается после успеха", async () => {
      setRateLimitStore(makeStore());
      const key = `login:test-${run}@example.com`;
      for (let i = 0; i < 3; i++) {
        assert.equal(await isRateLimited(key, 3), false);
        await recordFailure(key);
      }
      assert.equal(await isRateLimited(key, 3), true);
      await resetAttempts(key);
      assert.equal(await isRateLimited(key, 3), false);
    });

    test("чужой IP не может заблокировать вход по email", async () => {
      setRateLimitStore(makeStore());
      const attacker = loginKeys(ip(1), "victim@example.com");
      const victim = loginKeys(ip(2), "victim@example.com");
      for (let i = 0; i < 10; i++) await recordLoginFailure(attacker);
      assert.equal(await isLoginLimited(attacker), true);
      assert.equal(await isLoginLimited(victim), false);
    });

    test("перебор по многим email с одного IP упирается в лимит IP", async () => {
      setRateLimitStore(makeStore());
      for (let i = 0; i < 30; i++) await recordLoginFailure(loginKeys(ip(3), `user${i}@example.com`));
      assert.equal(await isLoginLimited(loginKeys(ip(3), "new@example.com")), true);
    });

    test("успешный вход не обнуляет лимит IP", async () => {
      setRateLimitStore(makeStore());
      for (let i = 0; i < 30; i++) await recordLoginFailure(loginKeys(ip(4), `spray${i}@example.com`));
      await recordLoginSuccess(loginKeys(ip(4), "me@example.com"));
      assert.equal(await isLoginLimited(loginKeys(ip(4), "other@example.com")), true);
    });
  });
}

test("Redis: у счётчика есть срок жизни", { skip: !redis }, async () => {
  const store = new RedisStore(redis!);
  const key = `ttl-${Date.now()}`;
  await store.increment(key);
  await store.increment(key);
  const ttl = await redis!.pttl(`rl:${key}`);
  assert.ok(ttl > 0 && ttl <= 15 * 60 * 1000, `ttl=${ttl}`);
  assert.equal(await store.count(key), 2);
});

test("clientIp берёт адрес, добавленный ближайшим прокси", () => {
  const req = { headers: new Headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" }) };
  assert.equal(clientIp(req), "203.0.113.9");
  assert.equal(clientIp({ headers: new Headers() }), "unknown");
});
