import { apiError, bookJSON, json } from "@/lib/api";
import { booksInGenre } from "@/lib/discover";
import { genreName, isGenre } from "@/lib/genres";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isGenre(slug)) return apiError("Жанр не найден", 404);
  return json({ slug, name: genreName(slug), books: (await booksInGenre(slug)).map(bookJSON) });
}
