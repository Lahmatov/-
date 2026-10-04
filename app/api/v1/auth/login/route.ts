import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { clientIp, isLoginLimited, loginKeys, recordLoginFailure, recordLoginSuccess } from "@/lib/rate-limit";
import { apiError, issueToken, json, readJson, userJSON } from "@/lib/api";

const schema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return apiError("Введите email и пароль");
  const keys = loginKeys(clientIp(req), parsed.data.email);
  if (await isLoginLimited(keys)) return apiError("Слишком много попыток. Подождите 15 минут.", 429);
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const ok = user?.passwordHash && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  if (!user || !ok) {
    await recordLoginFailure(keys);
    return apiError("Неверный email или пароль.", 401);
  }
  await recordLoginSuccess(keys);
  return json({ token: await issueToken(user.id, req.headers.get("x-device-name")), user: userJSON(user) });
}
