import { db } from "./db";
import { pushToUser } from "./push";
import type { Lang } from "./i18n";

export type NotificationType = "FOLLOW" | "LIKE" | "COMMENT";

/** Текст уведомления без глаголов прошедшего времени — не угадываем род. */
export function notificationText(type: string, actorName: string, bookTitle?: string | null, lang: Lang = "ru"): string {
  if (lang === "en") {
    switch (type) {
      case "FOLLOW":
        return `${actorName} started following you`;
      case "LIKE":
        return `${actorName} liked your review${bookTitle ? ` of “${bookTitle}”` : ""}`;
      case "COMMENT":
        return `${actorName} commented on your review${bookTitle ? ` of “${bookTitle}”` : ""}`;
      default:
        return actorName;
    }
  }
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
  // Не ждём APNs — запрос пользователя не должен тормозить из-за push. Текст — на языке каждого устройства.
  void pushToUser(userId, (lang) => ({
    title: lang === "en" ? "Bookshelf" : "Книжная полка",
    body: notificationText(type, actor?.name ?? (lang === "en" ? "Reader" : "Читатель"), entry?.book.title, lang),
  }));
}

export async function listNotifications(userId: string, lang: Lang = "ru", take = 50) {
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
      actor: { id: r.actor.id, name: r.actor.name ?? (lang === "en" ? "Reader" : "Читатель") },
      book,
      text: notificationText(r.type, r.actor.name ?? (lang === "en" ? "Reader" : "Читатель"), book?.title, lang),
    };
  });
}

export const unreadCount = (userId: string) => db.notification.count({ where: { userId, read: false } });

export async function markAllRead(userId: string) {
  await db.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}

export async function registerDevice(userId: string, token: string, lang: Lang = "ru") {
  await db.deviceToken.upsert({ where: { token }, create: { token, userId, lang }, update: { userId, lang } });
}

export async function unregisterDevice(userId: string, token: string) {
  await db.deviceToken.deleteMany({ where: { token, userId } });
}
