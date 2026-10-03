import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, apiUserId, entryJSON, json, readJson, unauthorized } from "@/lib/api";
import { bookExists, saveShelfReview, setShelfStatus } from "@/lib/shelf";
import { STATUSES } from "@/lib/status";
import { firstIssue, reviewJsonSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ bookId: string }> };

/** Смена статуса: { "status": "READING" }. Даты начала/окончания проставляются автоматически. */
export async function PUT(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const { bookId } = await params;
  const parsed = z.object({ status: z.enum(STATUSES) }).safeParse(await readJson(req));
  if (!parsed.success) return apiError("Некорректный статус");
  if (!(await bookExists(bookId))) return apiError("Книга не найдена", 404);
  const entry = await setShelfStatus(userId, bookId, parsed.data.status);
  return json({ entry: entryJSON(entry) });
}

/** Оценка, отзыв, публичность и даты. */
export async function PATCH(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const { bookId } = await params;
  const body = await readJson(req);
  const parsed = reviewJsonSchema.safeParse(body);
  if (!parsed.success) return apiError(firstIssue(parsed.error));
  if (!(await bookExists(bookId))) return apiError("Книга не найдена", 404);
  // Даты, которых нет в запросе, не трогаем (null в запросе — стереть дату).
  const sent = (key: string) => typeof body === "object" && body !== null && key in body;
  const data = { ...parsed.data };
  if (!sent("startedAt") || !sent("finishedAt")) {
    const prev = await db.shelfEntry.findUnique({ where: { userId_bookId: { userId, bookId } } });
    if (!sent("startedAt")) data.startedAt = prev?.startedAt ?? null;
    if (!sent("finishedAt")) data.finishedAt = prev?.finishedAt ?? null;
  }
  const result = await saveShelfReview(userId, bookId, data);
  if ("error" in result) return apiError(result.error ?? "Ошибка");
  return json({ entry: entryJSON(result.entry) });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const { bookId } = await params;
  await db.shelfEntry.deleteMany({ where: { userId, bookId } });
  return json({ ok: true });
}
