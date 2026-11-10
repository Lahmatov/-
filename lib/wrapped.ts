import { db } from "./db";
import { splitAuthors } from "./discover";
import { genreName } from "./genres";
import type { Lang } from "./i18n";

export type Wrapped = Awaited<ReturnType<typeof getWrapped>>;

function mostFrequent(values: string[]): { value: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: { value: string; count: number } | null = null;
  for (const [value, count] of counts) if (!best || count > best.count) best = { value, count };
  return best;
}

/** «Итоги года» в духе Spotify Wrapped. */
export async function getWrapped(userId: string, year: number, lang: Lang = "ru") {
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year + 1, 0, 1));
  const [user, entries] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { name: true } }),
    db.shelfEntry.findMany({
      where: { userId, status: "READ", finishedAt: { gte: from, lt: to } },
      include: { book: { include: { genres: { select: { genreSlug: true } } } } },
      orderBy: { finishedAt: "asc" },
    }),
  ]);

  const pagesOf = (e: (typeof entries)[number]) => e.totalPages ?? e.book.pageCount ?? 0;
  const rated = entries.filter((e) => e.rating !== null);
  const byMonth = new Array<number>(12).fill(0);
  for (const e of entries) byMonth[e.finishedAt!.getUTCMonth()]++;

  const best = [...rated].sort((a, b) => b.rating! - a.rating! || b.finishedAt!.getTime() - a.finishedAt!.getTime())[0];
  const longest = [...entries].filter((e) => pagesOf(e) > 0).sort((a, b) => pagesOf(b) - pagesOf(a))[0];
  const topAuthor = mostFrequent(entries.flatMap((e) => splitAuthors(e.book.author)));
  const topGenre = mostFrequent(entries.flatMap((e) => e.book.genres.map((g) => g.genreSlug)));
  const busiest = byMonth.indexOf(Math.max(...byMonth));

  return {
    year,
    name: user?.name ?? (lang === "en" ? "Reader" : "Читатель"),
    booksRead: entries.length,
    pagesRead: entries.reduce((sum, e) => sum + pagesOf(e), 0),
    avgRating: rated.length ? Math.round((rated.reduce((s, e) => s + e.rating!, 0) / rated.length) * 10) / 10 : null,
    topAuthor: topAuthor && topAuthor.count > 1 ? topAuthor : null,
    topGenre: topGenre ? { slug: topGenre.value, name: genreName(topGenre.value, lang), count: topGenre.count } : null,
    bestBook: best ? { book: best.book, rating: best.rating! } : null,
    longestBook: longest ? { book: longest.book, pages: pagesOf(longest) } : null,
    firstBook: entries[0]?.book ?? null,
    busiestMonth: entries.length ? busiest : null,
    byMonth,
  };
}
