import { apiError, apiUserId, bookJSON, json, listSummaryJSON, publicUserJSON } from "@/lib/api";
import { getProfile } from "@/lib/social";

/** Публичный профиль: счётчики, что читает сейчас, что прочитал недавно, публичные списки. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getProfile((await params).id, await apiUserId(req));
  if (!profile) return apiError("Пользователь не найден", 404);
  return json({
    user: publicUserJSON(profile.user),
    isMe: profile.isMe,
    isFollowing: profile.isFollowing,
    counts: profile.counts,
    readingNow: profile.readingNow.map((e) => bookJSON(e.book)),
    recentlyRead: profile.recentlyRead.map((e) => ({ book: bookJSON(e.book), rating: e.rating, finishedAt: e.finishedAt })),
    lists: profile.lists.map(listSummaryJSON),
  });
}
