import { apiUserId, bookJSON, json, publicUserJSON, unauthorized } from "@/lib/api";
import { getFeed } from "@/lib/social";
import { socialFor } from "@/lib/reviews";

/** Лента тех, на кого подписан. Пагинация: ?cursor=<nextCursor из прошлого ответа>. */
export async function GET(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const feed = await getFeed(userId, new URL(req.url).searchParams.get("cursor"));
  const social = await socialFor(
    feed.items.filter((a) => a.type === "REVIEW" && a.entryId).map((a) => a.entryId!),
    userId,
  );
  return json({
    followingCount: feed.followingCount,
    nextCursor: feed.nextCursor,
    items: feed.items.map((a) => ({
      id: a.id,
      type: a.type,
      status: a.status,
      rating: a.rating,
      review: a.review,
      entryId: a.entryId,
      ...(a.type === "REVIEW" && a.entryId ? social.get(a.entryId) : {}),
      createdAt: a.createdAt,
      user: publicUserJSON(a.user),
      book: bookJSON(a.book),
    })),
  });
}
