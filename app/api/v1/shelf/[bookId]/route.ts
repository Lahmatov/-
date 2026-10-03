import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, apiUserId, entryJSON, json, readJson, unauthorized } from "@/lib/api";
import { saveShelfReview, setShelfStatus } from "@/lib/shelf";
import { STATUSES } from "@/lib/status";
import { firstIssue, reviewJsonSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ bookId: string }> };

async function bookExists(bookId: string) {
  return (await db.book.count({ where: { id: bookId } })) > 0;
}

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
  const parsed = reviewJsonSchema.safeParse(await readJson(req));
  if (!parsed.success) return apiError(firstIssue(parsed.error));
  if (!(await bookExists(bookId))) return apiError("Книга не найдена", 404);
  const result = await saveShelfReview(userId, bookId, parsed.data);
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
