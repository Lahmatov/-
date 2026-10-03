import { apiUserId, bookJSON, json, publicUserJSON, unauthorized } from "@/lib/api";
import { getFeed } from "@/lib/social";

/** Лента тех, на кого подписан. Пагинация: ?cursor=<nextCursor из прошлого ответа>. */
export async function GET(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const feed = await getFeed(userId, new URL(req.url).searchParams.get("cursor"));
  return json({
    followingCount: feed.followingCount,
    nextCursor: feed.nextCursor,
    items: feed.items.map((a) => ({
      id: a.id,
      type: a.type,
      status: a.status,
      rating: a.rating,
      review: a.review,
      createdAt: a.createdAt,
      user: publicUserJSON(a.user),
      book: bookJSON(a.book),
    })),
  });
}
