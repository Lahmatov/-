import { z } from "zod";
import { apiError, apiUserId, json, readJson, unauthorized } from "@/lib/api";
import { joinChallengeByCode } from "@/lib/challenges";
import { clientIp, isRateLimited, recordFailure } from "@/lib/rate-limit";

/** { code } — вступить в закрытый челлендж по коду. */
export async function POST(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const parsed = z.object({ code: z.string().trim().min(4).max(32) }).safeParse(await readJson(req));
  if (!parsed.success) return apiError("Введите код приглашения");
  const key = `challenge-join:${userId}:${clientIp(req)}`;
  if (await isRateLimited(key, 20)) return apiError("Слишком много попыток. Подождите 15 минут.", 429);
  const challenge = await joinChallengeByCode(parsed.data.code, userId);
  if (!challenge) {
    await recordFailure(key);
    return apiError("Челлендж с таким кодом не найден", 404);
  }
  if (challenge === "FINISHED") return apiError("Челлендж уже закончился", 409);
  return json({ challenge: { id: challenge.id } });
}
