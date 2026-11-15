import { apiError, apiUserId, json, unauthorized } from "@/lib/api";
import { likeReview, socialFor, unlikeReview } from "@/lib/reviews";

type Ctx = { params: Promise<{ entryId: string }> };

async function state(entryId: string, userId: string) {
  const s = (await socialFor([entryId], userId)).get(entryId)!;
  return { likes: s.likes, likedByMe: s.likedByMe };
}

export async function POST(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const { entryId } = await params;
  if (!(await likeReview(userId, entryId))) return apiError("Отзыв не найден", 404);
  return json(await state(entryId, userId));
}

export async function DELETE(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const { entryId } = await params;
  await unlikeReview(userId, entryId);
  return json(await state(entryId, userId));
}
