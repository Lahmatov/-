import { z } from "zod";
import { apiError, json, readJson } from "@/lib/api";
import { requestPasswordReset } from "@/lib/account";
import { clientIp, isRateLimited, recordFailure } from "@/lib/rate-limit";

/** { email } → письмо со ссылкой. Ответ одинаковый для существующих и несуществующих адресов. */
export async function POST(req: Request) {
  const parsed = z.object({ email: z.string().trim().toLowerCase().email() }).safeParse(await readJson(req));
  if (!parsed.success) return apiError("Некорректный email");
  const key = `reset:${clientIp(req)}`;
  if (isRateLimited(key, 5)) return apiError("Слишком много запросов. Подождите 15 минут.", 429);
  recordFailure(key);
  await requestPasswordReset(parsed.data.email);
  return json({ ok: true });
}
