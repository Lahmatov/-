import { db } from "@/lib/db";
import { apiError, apiUserId, json, readJson, unauthorized, userJSON } from "@/lib/api";
import { updateName } from "@/lib/social";
import { firstIssue, nameSchema } from "@/lib/validation";

export async function GET(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return unauthorized();
  return json({ user: userJSON(user) });
}

/** Смена имени: { name }. Имя видно в отзывах, ленте и профиле. */
export async function PATCH(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const parsed = nameSchema.safeParse(await readJson(req));
  if (!parsed.success) return apiError(firstIssue(parsed.error));
  return json({ user: userJSON(await updateName(userId, parsed.data.name)) });
}

/** Удаление аккаунта (обязательно для App Store). Полка, отзывы и токены удаляются каскадно. */
export async function DELETE(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  await db.user.delete({ where: { id: userId } });
  return json({ ok: true });
}
