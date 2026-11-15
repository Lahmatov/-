import { apiError, bookJSON, json } from "@/lib/api";
import { getAuthor } from "@/lib/discover";

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const author = await getAuthor(decodeURIComponent((await params).name));
  if (!author) return apiError("Автор не найден", 404);
  return json({
    name: author.name,
    avgRating: author.avgRating,
    ratingsCount: author.ratingsCount,
    readersCount: author.readersCount,
    books: author.books.map((b) => ({ book: bookJSON(b.book), avgRating: b.avgRating, ratingsCount: b.ratingsCount })),
  });
}
