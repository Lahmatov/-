import { apiError, apiUserId, json, unauthorized } from "@/lib/api";
import { deleteComment } from "@/lib/reviews";

/** Удаляет автор комментария или автор отзыва. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  if (!(await deleteComment(userId, (await params).id))) return apiError("Комментарий не найден", 404);
  return json({ ok: true });
}
