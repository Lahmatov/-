import { apiError, apiUserId, json, unauthorized } from "@/lib/api";
import { deletePost } from "@/lib/clubs";

type Ctx = { params: Promise<{ id: string }> };

/** Удалить сообщение: автор или владелец клуба. */
export async function DELETE(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  if (!(await deletePost((await params).id, userId))) return apiError("Сообщение не найдено", 404);
  return json({ ok: true });
}
