import { apiError, apiUserId, json, unauthorized } from "@/lib/api";
import { follow, unfollow } from "@/lib/social";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  if (!(await follow(userId, (await params).id))) return apiError("Нельзя подписаться на этого пользователя", 400);
  return json({ isFollowing: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  await unfollow(userId, (await params).id);
  return json({ isFollowing: false });
}
