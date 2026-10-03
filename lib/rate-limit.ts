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

export function isLoginLimited(keys: LoginKeys): boolean {
  return isRateLimited(keys.ip, LOGIN_PER_IP) || isRateLimited(keys.pair, LOGIN_PER_IP_AND_EMAIL);
}

export function recordLoginFailure(keys: LoginKeys) {
  recordFailure(keys.ip);
  recordFailure(keys.pair);
}

/** Успешный вход сбрасывает только пару: иначе вход в свой аккаунт обнулял бы лимит перебора с этого IP. */
export function recordLoginSuccess(keys: LoginKeys) {
  resetAttempts(keys.pair);
}
