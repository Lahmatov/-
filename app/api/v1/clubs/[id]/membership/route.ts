import { apiError, apiUserId, json, unauthorized } from "@/lib/api";
import { leaveClub } from "@/lib/clubs";

type Ctx = { params: Promise<{ id: string }> };

/** Выйти из клуба. */
export async function DELETE(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  if (!(await leaveClub((await params).id, userId))) return apiError("Клуб не найден", 404);
  return json({ ok: true });
}
