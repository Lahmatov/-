import { db } from "@/lib/db";
import { apiUserId, json, unauthorized } from "@/lib/api";
import { bookGenres } from "@/lib/genres";

/** Убрать жанр может тот, кто его поставил (жанры из Open Library и сида не трогаем). */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; slug: string }> }) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const { id, slug } = await params;
  await db.bookGenre.deleteMany({ where: { bookId: id, genreSlug: slug, addedById: userId } });
  return json({ genres: await bookGenres(id) });
}
