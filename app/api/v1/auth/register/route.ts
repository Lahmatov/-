import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/account";
import { allowRegistrationAttempt, clientIp } from "@/lib/rate-limit";
import { apiError, issueToken, json, readJson, userJSON } from "@/lib/api";
import { firstIssue, registerSchema } from "@/lib/validation";

export async function POST(req: Request) {
  // Не больше 10 регистраций с одного адреса за 15 минут (общий лимит с веб-формой).
  if (!(await allowRegistrationAttempt(clientIp(req)))) return apiError("Слишком много попыток. Подождите 15 минут.", 429);
  const parsed = registerSchema.safeParse(await readJson(req));
  if (!parsed.success) return apiError(firstIssue(parsed.error));
  const { name, email, password } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) {
    return apiError("Пользователь с таким email уже есть — войдите.", 409);
  }
  const user = await db.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 10) } });
  await sendVerificationEmail(email).catch((e) => console.error("verification email failed", e));
  return json({ token: await issueToken(user.id, req.headers.get("x-device-name")), user: userJSON(user) }, 201);
}
