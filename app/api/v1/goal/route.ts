import { apiError, apiUserId, json, readJson, unauthorized } from "@/lib/api";
import { getYearStats, setGoal } from "@/lib/stats";
import { firstIssue, goalSchema } from "@/lib/validation";

/** { year, target } — поставить цель; target: null — убрать. Возвращает обновлённые итоги года. */
export async function PUT(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const parsed = goalSchema.safeParse(await readJson(req));
  if (!parsed.success) return apiError(firstIssue(parsed.error));
  await setGoal(userId, parsed.data.year, parsed.data.target);
  return json(await getYearStats(userId, parsed.data.year));
}
