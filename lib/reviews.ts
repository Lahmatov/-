import { db } from "./db";
import { notify } from "./notifications";

// Лайки и комментарии к отзывам. Отзыв — это публичная запись полки с текстом или оценкой.

async function interactiveEntry(entryId: string) {
  const entry = await db.shelfEntry.findUnique({ where: { id: entryId } });
  if (!entry || !entry.isPublic || (entry.review === null && entry.rating === null)) return null;
  return entry;
}

export async function likeReview(userId: string, entryId: string) {
  const entry = await interactiveEntry(entryId);
  if (!entry) return false;
  await db.reviewLike.upsert({
    where: { userId_entryId: { userId, entryId } },
    create: { userId, entryId },
    update: {},
  });
  await notify(entry.userId, userId, "LIKE", entryId);
  return true;
}

export async function unlikeReview(userId: string, entryId: string) {
  await db.reviewLike.deleteMany({ where: { userId, entryId } });
}

export async function listComments(entryId: string) {
  const entry = await interactiveEntry(entryId);
  if (!entry) return null;
  const comments = await db.reviewComment.findMany({
    where: { entryId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return { entry, comments };
}

export async function addComment(userId: string, entryId: string, text: string) {
  const entry = await interactiveEntry(entryId);
  if (!entry) return null;
  const comment = await db.reviewComment.create({
    data: { userId, entryId, text },
    include: { user: { select: { id: true, name: true } } },
  });
  await notify(entry.userId, userId, "COMMENT", entryId);
  return comment;
}

/** Удалить комментарий может его автор или автор отзыва. */
export async function deleteComment(userId: string, commentId: string) {
  const comment = await db.reviewComment.findUnique({ where: { id: commentId }, include: { entry: true } });
  if (!comment || (comment.userId !== userId && comment.entry.userId !== userId)) return false;
  await db.reviewComment.delete({ where: { id: commentId } });
  return true;
}

/** Число лайков, лайкнул ли читатель и число комментариев — для набора отзывов одним запросом. */
export async function socialFor(entryIds: string[], viewerId: string | null) {
  const map = new Map<string, { likes: number; likedByMe: boolean; comments: number }>();
  if (entryIds.length === 0) return map;
  const [likes, mine, comments] = await Promise.all([
    db.reviewLike.groupBy({ by: ["entryId"], where: { entryId: { in: entryIds } }, _count: true }),
    viewerId
      ? db.reviewLike.findMany({ where: { userId: viewerId, entryId: { in: entryIds } }, select: { entryId: true } })
      : [],
    db.reviewComment.groupBy({ by: ["entryId"], where: { entryId: { in: entryIds } }, _count: true }),
  ]);
  for (const id of entryIds) {
    map.set(id, {
      likes: likes.find((l) => l.entryId === id)?._count ?? 0,
      likedByMe: mine.some((m) => m.entryId === id),
      comments: comments.find((c) => c.entryId === id)?._count ?? 0,
    });
  }
  return map;
}
