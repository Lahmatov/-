import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { GENRES } from "@/lib/genres";
import { langOf } from "@/lib/i18n";

/** Все жанры с числом книг. */
export async function GET(req: Request) {
  const lang = langOf(req);
  const counts = await db.bookGenre.groupBy({ by: ["genreSlug"], _count: true });
  return json({
    genres: GENRES.map((g) => ({
      slug: g.slug,
      name: lang === "en" ? g.nameEn : g.name,
      count: counts.find((c) => c.genreSlug === g.slug)?._count ?? 0,
    })),
  });
}
