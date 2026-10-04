import { bookJSON, json } from "@/lib/api";
import { topRated, trending } from "@/lib/discover";
import { isGenre } from "@/lib/genres";

/** Лучшие по оценкам (?genre= — в жанре) и популярное за месяц. */
export async function GET(req: Request) {
  const genre = new URL(req.url).searchParams.get("genre");
  const [top, hot] = await Promise.all([topRated(30, isGenre(genre) ? genre : null), trending(20)]);
  return json({
    top: top.map((r) => ({ book: bookJSON(r.book), avgRating: r.avgRating, ratingsCount: r.ratingsCount })),
    trending: hot.map((t) => ({ book: bookJSON(t.book), count: t.count })),
  });
}
