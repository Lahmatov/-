import { db } from "@/lib/db";
import { apiUserId, json, unauthorized, userJSON } from "@/lib/api";

export async function GET(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return unauthorized();
  return json({ user: userJSON(user) });
}

/** Удаление аккаунта (обязательно для App Store). Полка, отзывы и токены удаляются каскадно. */
export async function DELETE(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  await db.user.delete({ where: { id: userId } });
  return json({ ok: true });
}
