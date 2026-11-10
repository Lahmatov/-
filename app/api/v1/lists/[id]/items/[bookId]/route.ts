import { apiError, apiUserId, json, unauthorized } from "@/lib/api";
import { removeFromList } from "@/lib/lists";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; bookId: string }> }) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const { id, bookId } = await params;
  if (!(await removeFromList(id, userId, bookId))) return apiError("Список не найден", 404);
  return json({ ok: true });
}
