import { db } from "./db";
import { recordActivity } from "./social";
import { bookGenres } from "./genres";
import type { Lang } from "./i18n";
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

export async function bookExists(bookId: string) {
  return (await db.book.count({ where: { id: bookId } })) > 0;
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

  const entry = await db.shelfEntry.upsert({
    where: { userId_bookId: { userId, bookId } },
    create: { userId, bookId, ...data },
    update: data,
  });
  if (prev?.status !== status) await recordActivity(userId, bookId, "STATUS", { status });
  return entry;
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
  const prev = await db.shelfEntry.findUnique({ where: { userId_bookId: { userId, bookId } } });
  const entry = await db.shelfEntry.upsert({
    where: { userId_bookId: { userId, bookId } },
    create: { userId, bookId, status: "READ", ...data },
    update: data,
  });
  // В ленту — только новая оценка или новый публичный отзыв.
  const ratingChanged = data.rating !== null && data.rating !== prev?.rating;
  const reviewChanged = data.isPublic && data.review !== null && data.review !== prev?.review;
  if (ratingChanged || reviewChanged) await recordActivity(userId, bookId, "REVIEW", { rating: data.rating });
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
export async function getBookDetails(bookId: string, userId: string | null, lang: Lang = "ru") {
  const book = await db.book.findUnique({ where: { id: bookId } });
  if (!book) return null;
  const [mine, stats, readers, reviews, genres] = await Promise.all([
    userId ? db.shelfEntry.findUnique({ where: { userId_bookId: { userId, bookId } } }) : null,
    db.shelfEntry.aggregate({
      where: { bookId, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    db.shelfEntry.count({ where: { bookId, status: "READ" } }),
    db.shelfEntry.findMany({
      where: { bookId, isPublic: true, reviewHidden: false, review: { not: null }, ...(userId ? { userId: { not: userId } } : {}) },
      include: { user: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    bookGenres(bookId, lang),
  ]);
  return {
    book,
    mine,
    stats: { avgRating: stats._avg.rating, ratingsCount: stats._count.rating, readersCount: readers },
    reviews,
    genres,
  };
}

/** Прогресс чтения. Книга без записи на полке попадает в «Читаю». */
export async function setProgress(userId: string, bookId: string, currentPage: number | null, totalPages?: number | null) {
  const book = await db.book.findUnique({ where: { id: bookId }, select: { pageCount: true } });
  if (!book) return { error: "Книга не найдена" } as const;
  const existing = await db.shelfEntry.findUnique({ where: { userId_bookId: { userId, bookId } } });
  const total = totalPages ?? null;
  const limit = total ?? existing?.totalPages ?? book.pageCount;
  if (currentPage !== null && limit && currentPage > limit) {
    return { error: `В книге ${limit} стр.` } as const;
  }
  // Первое указание числа страниц сохраняем и в книгу — пригодится остальным читателям.
  if (total && !book.pageCount) await db.book.update({ where: { id: bookId }, data: { pageCount: total } });

  const data = { currentPage, ...(totalPages !== undefined ? { totalPages: total } : {}) };
  const entry = existing
    ? await db.shelfEntry.update({ where: { id: existing.id }, data })
    : await setShelfStatus(userId, bookId, "READING").then((e) => db.shelfEntry.update({ where: { id: e.id }, data }));
  return { entry } as const;
}

/** Доля прочитанного 0..1 или null, если неизвестно число страниц. */
export function progressOf(entry: { currentPage: number | null; totalPages: number | null }, book: { pageCount: number | null }) {
  const total = entry.totalPages ?? book.pageCount;
  if (!total || entry.currentPage === null) return null;
  return Math.min(1, entry.currentPage / total);
}
