import Redis from "ioredis";

// Ограничитель попыток (вход, регистрация, коды приглашений). Если задан REDIS_URL — счётчики в Redis
// (общие для всех серверов и переживают перезапуск), иначе — в памяти процесса (один сервер, разработка).

const WINDOW_MS = 15 * 60 * 1000;

interface Store {
  count(key: string): Promise<number>;
  increment(key: string): Promise<void>;
  reset(key: string): Promise<void>;
}

type Bucket = { count: number; resetAt: number };

export class MemoryStore implements Store {
  private buckets = new Map<string, Bucket>();

  async count(key: string) {
    const bucket = this.buckets.get(key);
    return bucket && bucket.resetAt > Date.now() ? bucket.count : 0;
  }

  async increment(key: string) {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
      if (this.buckets.size > 10_000) this.prune(now);
    } else {
      bucket.count++;
    }
  }

  async reset(key: string) {
    this.buckets.delete(key);
  }

  private prune(now: number) {
    for (const [key, bucket] of this.buckets) if (bucket.resetAt <= now) this.buckets.delete(key);
  }
}

/** Окно начинается с первой неудачной попытки: INCR и срок жизни только у нового ключа (PEXPIRE NX). */
export class RedisStore implements Store {
  constructor(private redis: Redis) {}

  async count(key: string) {
    return Number((await this.redis.get(`rl:${key}`)) ?? 0);
  }

  async increment(key: string) {
    await this.redis.multi().incr(`rl:${key}`).pexpire(`rl:${key}`, WINDOW_MS, "NX").exec();
  }

  async reset(key: string) {
    await this.redis.del(`rl:${key}`);
  }
}

let store: Store | undefined;

function getStore(): Store {
  if (!store) {
    const url = process.env.REDIS_URL;
    store = url ? new RedisStore(new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: true })) : new MemoryStore();
  }
  return store;
}

/** Для тестов: подменить хранилище. */
export function setRateLimitStore(next: Store) {
  store = next;
}

/** Не превышен ли лимит по ключу. Вызывайте перед проверкой пароля. */
export async function isRateLimited(key: string, limit = 10): Promise<boolean> {
  return (await getStore().count(key)) >= limit;
}

/** Отмечает неудачную попытку. */
export async function recordFailure(key: string) {
  await getStore().increment(key);
}

export async function resetAttempts(key: string) {
  await getStore().reset(key);
}

/**
 * IP клиента. Берём последний адрес из X-Forwarded-For — его дописал ближайший прокси (Caddy, Vercel),
 * а начало заголовка клиент может подделать.
 */
export function clientIp(req: Pick<Request, "headers">): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return forwarded?.at(-1) || req.headers.get("x-real-ip") || "unknown";
}

const LOGIN_PER_IP = 30;
const LOGIN_PER_IP_AND_EMAIL = 10;

/**
 * Попытки входа считаем по IP и по паре IP + email. Так злоумышленник не заблокирует чужой email
 * (лимит пары касается только его IP), а перебор паролей по многим email с одного IP упирается в лимит IP.
 */
export function loginKeys(ip: string, email: string) {
  return { ip: `login-ip:${ip}`, pair: `login:${ip}:${email.trim().toLowerCase()}` };
}

export type LoginKeys = ReturnType<typeof loginKeys>;

export async function isLoginLimited(keys: LoginKeys): Promise<boolean> {
  const [byIp, byPair] = await Promise.all([
    isRateLimited(keys.ip, LOGIN_PER_IP),
    isRateLimited(keys.pair, LOGIN_PER_IP_AND_EMAIL),
  ]);
  return byIp || byPair;
}

export async function recordLoginFailure(keys: LoginKeys) {
  await Promise.all([recordFailure(keys.ip), recordFailure(keys.pair)]);
}

/** Успешный вход сбрасывает только пару: иначе вход в свой аккаунт обнулял бы лимит перебора с этого IP. */
export async function recordLoginSuccess(keys: LoginKeys) {
  await resetAttempts(keys.pair);
}
