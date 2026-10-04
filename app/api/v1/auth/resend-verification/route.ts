import { db } from "@/lib/db";
import { apiError, apiUserId, json, unauthorized } from "@/lib/api";
import { sendVerificationEmail } from "@/lib/account";
import { isRateLimited, recordFailure } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.email) return apiError("У аккаунта нет email");
  if (user.emailVerified) return json({ ok: true });
  const key = `verify:${user.email}`;
  if (await isRateLimited(key, 5)) return apiError("Слишком много запросов. Подождите 15 минут.", 429);
  await recordFailure(key);
  try {
    await sendVerificationEmail(user.email);
  } catch (e) {
    console.error("verification email failed", e);
    return apiError("Не удалось отправить письмо. Попробуйте позже.", 503);
  }
  return json({ ok: true });
}
