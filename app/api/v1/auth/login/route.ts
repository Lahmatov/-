import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { isRateLimited, loginKey, recordFailure, resetAttempts } from "@/lib/rate-limit";
import { apiError, issueToken, json, readJson, userJSON } from "@/lib/api";

const schema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return apiError("Введите email и пароль");
  const key = loginKey(parsed.data.email);
  if (isRateLimited(key)) return apiError("Слишком много попыток. Подождите 15 минут.", 429);
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const ok = user?.passwordHash && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  if (!user || !ok) {
    recordFailure(key);
    return apiError("Неверный email или пароль.", 401);
  }
  resetAttempts(key);
  return json({ token: await issueToken(user.id, req.headers.get("x-device-name")), user: userJSON(user) });
}
