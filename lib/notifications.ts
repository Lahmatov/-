import { db } from "./db";
import { pushToUser } from "./push";

export type NotificationType = "FOLLOW" | "LIKE" | "COMMENT";

/** Текст уведомления без глаголов прошедшего времени — не угадываем род. */
export function notificationText(type: string, actorName: string, bookTitle?: string | null): string {
  switch (type) {
    case "FOLLOW":
      return `${actorName} — новый подписчик`;
    case "LIKE":
      return `${actorName}: ♥ вашему отзыву${bookTitle ? ` на «${bookTitle}»` : ""}`;
    case "COMMENT":
      return `${actorName}: новый комментарий к отзыву${bookTitle ? ` на «${bookTitle}»` : ""}`;
    default:
      return actorName;
  }
}

/** Создаёт уведомление (не себе и без дублей лайков/подписок) и отправляет push. */
export async function notify(userId: string, actorId: string, type: NotificationType, entryId?: string | null) {
  if (userId === actorId) return;
  if (type !== "COMMENT") {
    const dup = await db.notification.findFirst({ where: { userId, actorId, type, entryId: entryId ?? null } });
    if (dup) return;
  }
  await db.notification.create({ data: { userId, actorId, type, entryId: entryId ?? null } });

  const [actor, entry] = await Promise.all([
    db.user.findUnique({ where: { id: actorId }, select: { name: true } }),
    entryId ? db.shelfEntry.findUnique({ where: { id: entryId }, include: { book: { select: { title: true } } } }) : null,
  ]);
  // Не ждём APNs — запрос пользователя не должен тормозить из-за push.
  void pushToUser(userId, "Книжная полка", notificationText(type, actor?.name ?? "Читатель", entry?.book.title));
}

export async function listNotifications(userId: string, take = 50) {
  const rows = await db.notification.findMany({
    where: { userId },
    include: { actor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });
  const entryIds = rows.map((r) => r.entryId).filter((id): id is string => !!id);
  const entries = entryIds.length
    ? await db.shelfEntry.findMany({ where: { id: { in: entryIds } }, include: { book: true } })
    : [];
  return rows.map((r) => {
    const book = entries.find((e) => e.id === r.entryId)?.book ?? null;
    return {
      id: r.id,
      type: r.type,
      read: r.read,
      createdAt: r.createdAt,
      actor: { id: r.actor.id, name: r.actor.name ?? "Читатель" },
      book,
      text: notificationText(r.type, r.actor.name ?? "Читатель", book?.title),
    };
  });
}

export const unreadCount = (userId: string) => db.notification.count({ where: { userId, read: false } });

export async function markAllRead(userId: string) {
  await db.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}

export async function registerDevice(userId: string, token: string) {
  await db.deviceToken.upsert({ where: { token }, create: { token, userId }, update: { userId } });
}

export async function unregisterDevice(userId: string, token: string) {
  await db.deviceToken.deleteMany({ where: { token, userId } });
}
