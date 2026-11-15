import { apiUserId, json, unauthorized } from "@/lib/api";
import { getYearStats, parseYear } from "@/lib/stats";

/** Итоги года: ?year=2026 (по умолчанию текущий). */
export async function GET(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const year = parseYear(new URL(req.url).searchParams.get("year"));
  return json(await getYearStats(userId, year));
}
