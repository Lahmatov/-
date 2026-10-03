// Простой ограничитель попыток в памяти процесса. Для нескольких серверов замените на Redis/Upstash.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000;

/** Не превышен ли лимит по ключу. Вызывайте перед проверкой пароля. */
export function isRateLimited(key: string, limit = 10): boolean {
  const bucket = buckets.get(key);
  return !!bucket && bucket.resetAt > Date.now() && bucket.count >= limit;
}

/** Отмечает неудачную попытку. */
export function recordFailure(key: string) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    if (buckets.size > 10_000) prune(now);
  } else {
    bucket.count++;
  }
}

export function resetAttempts(key: string) {
  buckets.delete(key);
}

function prune(now: number) {
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}

export const loginKey = (email: string) => `login:${email.trim().toLowerCase()}`;

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
