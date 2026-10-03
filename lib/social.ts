import { db } from "./db";
import { normalize } from "./books";
import { notify } from "./notifications";

// Подписки, публичные профили и лента активности.

const MERGE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Записывает событие для ленты. Повторные события того же типа по той же книге в течение
 * 10 минут обновляют предыдущее — «Начал → Отложил → Начал» не заспамит ленту друзей.
 */
export async function recordActivity(
  userId: string,
  bookId: string,
  type: "STATUS" | "REVIEW",
  data: { status?: string; rating?: number | null },
) {
  const recent = await db.activity.findFirst({
    where: { userId, bookId, type, createdAt: { gte: new Date(Date.now() - MERGE_WINDOW_MS) } },
    orderBy: { createdAt: "desc" },
  });
  const fields = { status: data.status ?? null, rating: data.rating ?? null };
  if (recent) {
    await db.activity.update({ where: { id: recent.id }, data: { ...fields, createdAt: new Date() } });
  } else {
    await db.activity.create({ data: { userId, bookId, type, ...fields } });
  }
}

export async function follow(followerId: string, followingId: string) {
  if (followerId === followingId) return false;
  const target = await db.user.count({ where: { id: followingId } });
  if (!target) return false;
  const existing = await db.follow.findUnique({ where: { followerId_followingId: { followerId, followingId } } });
  if (!existing) {
    await db.follow.create({ data: { followerId, followingId } });
    await notify(followingId, followerId, "FOLLOW");
  }
  return true;
}

export async function unfollow(followerId: string, followingId: string) {
  await db.follow.deleteMany({ where: { followerId, followingId } });
}

export async function updateName(userId: string, name: string) {
  return db.user.update({ where: { id: userId }, data: { name } });
}

/** Поиск людей по имени. Пользователей немного, поэтому фильтруем в памяти (работает и для кириллицы). */
export async function searchUsers(query: string, take = 20) {
  const q = normalize(query);
  if (q.length < 2) return [];
  const users = await db.user.findMany({
    where: { name: { not: null } },
    select: { id: true, name: true, image: true },
    orderBy: { followers: { _count: "desc" } },
    take: 5000,
  });
  return users.filter((u) => normalize(u.name ?? "").includes(q)).slice(0, take);
}

export async function getProfile(userId: string, viewerId: string | null) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, image: true } });
  if (!user) return null;
  const isMe = viewerId === userId;
  // Записи, скрытые владельцем («не показывать другим»), видит только он сам.
  const visible = isMe ? {} : { isPublic: true };

  const [followers, following, readCount, isFollowing, readingNow, recentlyRead, lists] = await Promise.all([
    db.follow.count({ where: { followingId: userId } }),
    db.follow.count({ where: { followerId: userId } }),
    db.shelfEntry.count({ where: { userId, status: "READ", ...visible } }),
    viewerId && !isMe
      ? db.follow.count({ where: { followerId: viewerId, followingId: userId } }).then((n) => n > 0)
      : false,
    db.shelfEntry.findMany({
      where: { userId, status: "READING", ...visible },
      include: { book: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    db.shelfEntry.findMany({
      where: { userId, status: "READ", ...visible },
      include: { book: true },
      orderBy: [{ finishedAt: "desc" }, { updatedAt: "desc" }],
      take: 12,
    }),
    db.bookList.findMany({
      where: { userId, ...(isMe ? {} : { isPublic: true }) },
      include: { _count: { select: { items: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return {
    user,
    isMe,
    isFollowing,
    counts: { followers, following, read: readCount },
    readingNow,
    recentlyRead,
    lists,
  };
}

export async function getFollowing(userId: string) {
  const rows = await db.follow.findMany({
    where: { followerId: userId },
    include: { following: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => r.following);
}

/** Лента: события тех, на кого подписан пользователь. cursor — id последнего события предыдущей страницы. */
export async function getFeed(viewerId: string, cursor?: string | null, take = 30) {
  const followingIds = (await db.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } })).map(
    (f) => f.followingId,
  );
  if (followingIds.length === 0) return { items: [], nextCursor: null, followingCount: 0 };

  const activities = await db.activity.findMany({
    where: { userId: { in: followingIds } },
    include: { user: { select: { id: true, name: true, image: true } }, book: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = activities.slice(0, take);

  // Событие показываем, только если запись на полке сейчас публичная: скрытая владельцем
  // или удалённая с полки книга пропадает из ленты. Текст отзыва берём оттуда же.
  const entries = page.length
    ? await db.shelfEntry.findMany({
        where: { OR: page.map((a) => ({ userId: a.userId, bookId: a.bookId })), isPublic: true },
        select: { id: true, userId: true, bookId: true, review: true },
      })
    : [];
  const entryOf = (a: { userId: string; bookId: string }) =>
    entries.find((e) => e.userId === a.userId && e.bookId === a.bookId);
  const reviewOf = (a: { userId: string; bookId: string }) => entryOf(a)?.review ?? null;

  return {
    items: page.filter((a) => entryOf(a)).map((a) => ({
      id: a.id,
      type: a.type,
      status: a.status,
      rating: a.rating,
      review: a.type === "REVIEW" ? reviewOf(a) : null,
      entryId: entryOf(a)?.id ?? null,
      createdAt: a.createdAt,
      user: a.user,
      book: a.book,
    })),
    nextCursor: activities.length > take ? page[page.length - 1].id : null,
    followingCount: followingIds.length,
  };
}
