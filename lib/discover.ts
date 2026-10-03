import type { Book } from "@prisma/client";
import { db } from "./db";
import { normalize } from "./books";
import type { Lang } from "./i18n";

// Страница автора, жанры, топы и рекомендации.

/** «Илья Ильф, Евгений Петров» → два автора. */
export function splitAuthors(author: string): string[] {
  return author
    .split(/\s*,\s*/)
    .map((a) => a.trim())
    .filter(Boolean);
}

type Stats = { avgRating: number | null; ratingsCount: number; readersCount: number };

/** Средняя оценка, число оценок и прочитавших для набора книг одним запросом. */
export async function statsFor(bookIds: string[]): Promise<Map<string, Stats>> {
  const result = new Map<string, Stats>();
  if (bookIds.length === 0) return result;
  const [ratings, readers] = await Promise.all([
    db.shelfEntry.groupBy({
      by: ["bookId"],
      where: { bookId: { in: bookIds }, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    db.shelfEntry.groupBy({ by: ["bookId"], where: { bookId: { in: bookIds }, status: "READ" }, _count: true }),
  ]);
  for (const id of bookIds) {
    const r = ratings.find((x) => x.bookId === id);
    result.set(id, {
      avgRating: r?._avg.rating ?? null,
      ratingsCount: r?._count.rating ?? 0,
      readersCount: readers.find((x) => x.bookId === id)?._count ?? 0,
    });
  }
  return result;
}

export async function getAuthor(name: string) {
  const key = normalize(name);
  if (!key) return null;
  const candidates = await db.book.findMany({ where: { searchText: { contains: key } }, take: 500 });
  const books = candidates
    .filter((b) => splitAuthors(b.author).some((a) => normalize(a) === key))
    .sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
  if (books.length === 0) return null;
  const stats = await statsFor(books.map((b) => b.id));
  const rated = [...stats.values()].filter((s) => s.avgRating !== null);
  const totalRatings = rated.reduce((n, s) => n + s.ratingsCount, 0);
  const avgRating = totalRatings
    ? rated.reduce((sum, s) => sum + (s.avgRating ?? 0) * s.ratingsCount, 0) / totalRatings
    : null;
  const displayName = splitAuthors(books[0].author).find((a) => normalize(a) === key) ?? name;
  return {
    name: displayName,
    books: books.map((b) => ({ book: b, ...stats.get(b.id)! })),
    avgRating,
    ratingsCount: totalRatings,
    readersCount: [...stats.values()].reduce((n, s) => n + s.readersCount, 0),
  };
}

/**
 * Взвешенная оценка (как в топе IMDb): у книги с парой оценок средняя тянется к общей средней,
 * поэтому одна «десятка» не обгонит книгу с сотней девяток.
 */
export function weightedRating(avg: number, votes: number, globalAvg: number, minVotes = 3): number {
  return (votes / (votes + minVotes)) * avg + (minVotes / (votes + minVotes)) * globalAvg;
}

export type RankedBook = { book: Book; score: number; avgRating: number | null; ratingsCount: number };

/** Лучшие книги по оценкам читателей (опционально — в жанре). */
export async function topRated(take = 30, genre?: string | null): Promise<RankedBook[]> {
  const where = { rating: { not: null }, ...(genre ? { book: { genres: { some: { genreSlug: genre } } } } : {}) };
  const [groups, global] = await Promise.all([
    db.shelfEntry.groupBy({ by: ["bookId"], where, _avg: { rating: true }, _count: { rating: true } }),
    db.shelfEntry.aggregate({ where: { rating: { not: null } }, _avg: { rating: true } }),
  ]);
  const globalAvg = global._avg.rating ?? 7;
  const ranked = groups
    .map((g) => ({
      bookId: g.bookId,
      avg: g._avg.rating ?? 0,
      votes: g._count.rating,
      score: weightedRating(g._avg.rating ?? 0, g._count.rating, globalAvg),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, take);
  const books = await db.book.findMany({ where: { id: { in: ranked.map((r) => r.bookId) } } });
  return ranked.flatMap((r) => {
    const book = books.find((b) => b.id === r.bookId);
    return book ? [{ book, score: r.score, avgRating: r.avg, ratingsCount: r.votes }] : [];
  });
}

/** Популярное: сколько раз книгу добавили на полки за последние `days` дней. */
export async function trending(take = 30, days = 30) {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);
  const groups = await db.shelfEntry.groupBy({
    by: ["bookId"],
    where: { createdAt: { gte: since } },
    _count: true,
    orderBy: { _count: { bookId: "desc" } },
    take,
  });
  const books = await db.book.findMany({ where: { id: { in: groups.map((g) => g.bookId) } } });
  return groups.flatMap((g) => {
    const book = books.find((b) => b.id === g.bookId);
    return book ? [{ book, count: g._count }] : [];
  });
}

export async function booksInGenre(slug: string, take = 60) {
  return db.book.findMany({
    where: { genres: { some: { genreSlug: slug } } },
    orderBy: [{ entries: { _count: "desc" } }, { year: "desc" }],
    take,
  });
}

/**
 * Рекомендации «что почитать дальше».
 * 1) Люди со схожим вкусом: те, кто высоко (8+) оценил те же книги, что и вы. Их любимые книги,
 *    которых нет на вашей полке, получают очки — тем больше, чем больше у вас общих любимых книг.
 * 2) Если таких людей нет — лучшие книги в ваших любимых жанрах, затем просто лучшие книги.
 */
export type RecommendationReason = "similar" | "genre" | "top";

export const REASON_TEXT: Record<RecommendationReason, Record<Lang, string>> = {
  similar: { ru: "Нравится читателям с похожим вкусом", en: "Loved by readers with similar taste" },
  genre: { ru: "Лучшее в любимом жанре", en: "Top pick in a genre you like" },
  top: { ru: "Высоко оценено читателями", en: "Highly rated by readers" },
};

export async function recommendations(userId: string, take = 20) {
  const mine = await db.shelfEntry.findMany({ where: { userId }, select: { bookId: true, rating: true } });
  const onShelf = new Set(mine.map((e) => e.bookId));
  const liked = mine.filter((e) => (e.rating ?? 0) >= 8).map((e) => e.bookId);

  const scores = new Map<string, { score: number; reason: RecommendationReason }>();

  if (liked.length) {
    const peers = await db.shelfEntry.groupBy({
      by: ["userId"],
      where: { bookId: { in: liked }, rating: { gte: 8 }, userId: { not: userId } },
      _count: true,
      orderBy: { _count: { userId: "desc" } },
      take: 50,
    });
    if (peers.length) {
      const peerWeight = new Map(peers.map((p) => [p.userId, p._count]));
      const theirFavorites = await db.shelfEntry.findMany({
        where: { userId: { in: [...peerWeight.keys()] }, rating: { gte: 8 }, bookId: { notIn: [...onShelf] } },
        select: { userId: true, bookId: true, rating: true },
      });
      for (const e of theirFavorites) {
        const prev = scores.get(e.bookId)?.score ?? 0;
        scores.set(e.bookId, {
          score: prev + (peerWeight.get(e.userId) ?? 1) * (e.rating ?? 8),
          reason: "similar",
        });
      }
    }
  }

  if (scores.size < take) {
    const favGenres = await db.bookGenre.groupBy({
      by: ["genreSlug"],
      where: { bookId: { in: liked.length ? liked : [...onShelf] } },
      _count: true,
      orderBy: { _count: { genreSlug: "desc" } },
      take: 3,
    });
    for (const g of favGenres) {
      for (const r of await topRated(take, g.genreSlug)) {
        if (!onShelf.has(r.book.id) && !scores.has(r.book.id)) {
          scores.set(r.book.id, { score: r.score / 100, reason: "genre" });
        }
      }
    }
  }

  if (scores.size < take) {
    for (const r of await topRated(take * 2)) {
      if (!onShelf.has(r.book.id) && !scores.has(r.book.id)) {
        scores.set(r.book.id, { score: r.score / 1000, reason: "top" });
      }
    }
  }

  const top = [...scores.entries()].sort((a, b) => b[1].score - a[1].score).slice(0, take);
  const books = await db.book.findMany({ where: { id: { in: top.map(([id]) => id) } } });
  return top.flatMap(([id, { reason }]) => {
    const book = books.find((b) => b.id === id);
    return book ? [{ book, reason }] : [];
  });
}
