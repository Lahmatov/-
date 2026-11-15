import { apiError, apiUserId, entryJSON, json, readJson, unauthorized } from "@/lib/api";
import { setProgress } from "@/lib/shelf";
import { firstIssue, progressSchema } from "@/lib/validation";

/** Прогресс: { currentPage, totalPages? }. currentPage: null сбрасывает прогресс. */
export async function PUT(req: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const parsed = progressSchema.safeParse(await readJson(req));
  if (!parsed.success) return apiError(firstIssue(parsed.error));
  const result = await setProgress(userId, (await params).bookId, parsed.data.currentPage, parsed.data.totalPages);
  if ("error" in result) return apiError(result.error ?? "Ошибка", result.error === "Книга не найдена" ? 404 : 400);
  return json({ entry: entryJSON(result.entry) });
}
