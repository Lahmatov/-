import { z } from "zod";
import { apiError, apiUserId, json, readJson, unauthorized } from "@/lib/api";
import { addToList } from "@/lib/lists";

/** Добавить книгу в свой список: { bookId }. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const parsed = z.object({ bookId: z.string().min(1) }).safeParse(await readJson(req));
  if (!parsed.success) return apiError("Нет bookId");
  if (!(await addToList((await params).id, userId, parsed.data.bookId))) return apiError("Список или книга не найдены", 404);
  return json({ ok: true });
}
