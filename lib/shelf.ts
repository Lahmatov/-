import { db } from "./db";
import { findDuplicate, makeSearchText } from "./books";
import type { ImportedBook } from "./importers";
import type { Status } from "./status";

// Общая логика полки и каталога — её используют и server actions сайта, и JSON API для iOS.

export async function createBook(userId: string, input: { title: string; author: string; year: number | null }) {
  const duplicate = await findDuplicate(input.title, input.author);
  if (duplicate) return { book: duplicate, existing: true };
  const book = await db.book.create({
    data: { ...input, searchText: makeSearchText(input.title, input.author), addedById: userId },
  });
  return { book, existing: false };
}

export async function setShelfStatus(userId: string, bookId: string, status: Status) {
  const now = new Date();
  const prev = await db.shelfEntry.findUnique({ where: { userId_bookId: { userId, bookId } } });

  const data: { status: string; startedAt?: Date | null; finishedAt?: Date | null } = { status };
  if (status === "READING") {
    // Начал заново после прочтения/брошенной книги — новый круг.
    if (!prev?.startedAt || prev.status === "READ" || prev.status === "DROPPED") data.startedAt = now;
    data.finishedAt = null;
  } else if (status === "READ") {
    data.finishedAt = now;
  } else if (status === "WANT") {
    data.startedAt = null;
    data.finishedAt = null;
  }

  return db.shelfEntry.upsert({
    where: { userId_bookId: { userId, bookId } },
    create: { userId, bookId, ...data },
    update: data,
  });
}

export type ReviewInput = {
  rating: number | null;
  review: string | null;
  isPublic: boolean;
  startedAt: Date | null;
  finishedAt: Date | null;
};

/** Сохраняет оценку/отзыв/даты. Возвращает текст ошибки или запись полки. */
export async function saveShelfReview(userId: string, bookId: string, data: ReviewInput) {
  if (data.startedAt && data.finishedAt && data.startedAt > data.finishedAt) {
    return { error: "Дата окончания раньше даты начала" } as const;
  }
  const entry = await db.shelfEntry.upsert({
    where: { userId_bookId: { userId, bookId } },
    create: { userId, bookId, status: "READ", ...data },
    update: data,
  });
  return { entry } as const;
}

/** Добавляет импортированные книги в каталог и на полку, не трогая уже отмеченные. */
export async function importBooks(userId: string, items: ImportedBook[]) {
  let added = 0;
  for (const item of items.slice(0, 5000)) {
    const book =
      (await findDuplicate(item.title, item.author)) ??
      (await db.book.create({
        data: {
          title: item.title,
          author: item.author,
          year: item.year ?? null,
          searchText: makeSearchText(item.title, item.author),
          addedById: userId,
        },
      }));
    const exists = await db.shelfEntry.findUnique({ where: { userId_bookId: { userId, bookId: book.id } } });
    if (exists) continue;
    await db.shelfEntry.create({
      data: {
        userId,
        bookId: book.id,
        status: item.status,
        rating: item.rating ?? null,
        review: item.review ?? null,
        finishedAt: item.finishedAt ?? null,
      },
    });
    added++;
  }
  return { found: items.length, added };
}

/** Всё для страницы книги: сама книга, моя запись, статистика и чужие публичные отзывы. */
export async function getBookDetails(bookId: string, userId: string | null) {
  const book = await db.book.findUnique({ where: { id: bookId } });
  if (!book) return null;
  const [mine, stats, readers, reviews] = await Promise.all([
    userId ? db.shelfEntry.findUnique({ where: { userId_bookId: { userId, bookId } } }) : null,
    db.shelfEntry.aggregate({
      where: { bookId, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    db.shelfEntry.count({ where: { bookId, status: "READ" } }),
    db.shelfEntry.findMany({
      where: { bookId, isPublic: true, review: { not: null }, ...(userId ? { userId: { not: userId } } : {}) },
      include: { user: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);
  return {
    book,
    mine,
    stats: { avgRating: stats._avg.rating, ratingsCount: stats._count.rating, readersCount: readers },
    reviews,
  };
}
