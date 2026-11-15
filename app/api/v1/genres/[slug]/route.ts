import { apiError, bookJSON, json } from "@/lib/api";
import { booksInGenre } from "@/lib/discover";
import { genreName, isGenre } from "@/lib/genres";
import { langOf } from "@/lib/i18n";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isGenre(slug)) return apiError("Жанр не найден", 404);
  return json({ slug, name: genreName(slug, langOf(req)), books: (await booksInGenre(slug)).map(bookJSON) });
}
