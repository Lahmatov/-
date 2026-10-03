import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { GENRES } from "@/lib/genres";

/** Все жанры с числом книг. */
export async function GET() {
  const counts = await db.bookGenre.groupBy({ by: ["genreSlug"], _count: true });
  return json({
    genres: GENRES.map((g) => ({
      slug: g.slug,
      name: g.name,
      count: counts.find((c) => c.genreSlug === g.slug)?._count ?? 0,
    })),
  });
}
