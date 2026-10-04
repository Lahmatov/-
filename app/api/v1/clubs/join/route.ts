import { z } from "zod";
import { apiError, apiUserId, json, readJson, unauthorized } from "@/lib/api";
import { joinClub } from "@/lib/clubs";
import { clientIp, isRateLimited, recordFailure } from "@/lib/rate-limit";

/** { code } — вступить в клуб по коду приглашения. */
export async function POST(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const parsed = z.object({ code: z.string().trim().min(4).max(32) }).safeParse(await readJson(req));
  if (!parsed.success) return apiError("Введите код приглашения");
  // Ограничиваем перебор кодов.
  const key = `club-join:${userId}:${clientIp(req)}`;
  if (isRateLimited(key, 20)) return apiError("Слишком много попыток. Подождите 15 минут.", 429);
  const result = await joinClub(userId, parsed.data.code);
  if ("error" in result) {
    if (result.error === "NOT_FOUND") {
      recordFailure(key);
      return apiError("Клуб с таким кодом не найден", 404);
    }
    return apiError("В клубе уже максимум участников", 409);
  }
  return json({ club: { id: result.club.id } });
}
