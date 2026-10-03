import { db } from "./db";

// Свои списки книг: «Лучшее за 2026», «Посоветовать маме» и т. п.

export type ListInput = { title: string; description: string | null; isPublic: boolean };

export async function getMyLists(userId: string, bookId?: string | null) {
  const lists = await db.bookList.findMany({
    where: { userId },
    include: {
      _count: { select: { items: true } },
      items: { include: { book: true }, orderBy: { addedAt: "desc" }, take: 3 },
    },
    orderBy: { updatedAt: "desc" },
  });
  const containing = bookId
    ? new Set(
        (await db.bookListItem.findMany({ where: { bookId, list: { userId } }, select: { listId: true } })).map(
          (i) => i.listId,
        ),
      )
    : null;
  return lists.map((l) => ({
    id: l.id,
    title: l.title,
    description: l.description,
    isPublic: l.isPublic,
    count: l._count.items,
    covers: l.items.map((i) => i.book.coverUrl).filter((c): c is string => !!c),
    containsBook: containing ? containing.has(l.id) : null,
  }));
}

export async function createList(userId: string, input: ListInput) {
  return db.bookList.create({ data: { userId, ...input } });
}

/** Список с книгами. Приватный список видит только владелец. */
export async function getList(listId: string, viewerId: string | null) {
  const list = await db.bookList.findUnique({
    where: { id: listId },
    include: {
      user: { select: { id: true, name: true } },
      items: { include: { book: true }, orderBy: { addedAt: "desc" } },
    },
  });
  if (!list) return null;
  const isOwner = list.userId === viewerId;
  if (!list.isPublic && !isOwner) return null;
  return { list, isOwner };
}

async function ownedList(listId: string, userId: string) {
  return db.bookList.findFirst({ where: { id: listId, userId } });
}

export async function updateList(listId: string, userId: string, input: ListInput) {
  if (!(await ownedList(listId, userId))) return null;
  return db.bookList.update({ where: { id: listId }, data: input });
}

export async function deleteList(listId: string, userId: string) {
  const { count } = await db.bookList.deleteMany({ where: { id: listId, userId } });
  return count > 0;
}

export async function addToList(listId: string, userId: string, bookId: string) {
  if (!(await ownedList(listId, userId))) return false;
  if (!(await db.book.count({ where: { id: bookId } }))) return false;
  await db.bookListItem.upsert({
    where: { listId_bookId: { listId, bookId } },
    create: { listId, bookId },
    update: {},
  });
  await db.bookList.update({ where: { id: listId }, data: { updatedAt: new Date() } });
  return true;
}

export async function removeFromList(listId: string, userId: string, bookId: string) {
  if (!(await ownedList(listId, userId))) return false;
  await db.bookListItem.deleteMany({ where: { listId, bookId } });
  return true;
}
