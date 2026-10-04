import { apiError, apiUserId, bookJSON, json } from "@/lib/api";
import { findByIsbn } from "@/lib/books";
import { normalizeIsbn } from "@/lib/isbn";

/** Книга по ISBN (для сканера штрихкодов). 404 — не нашли ни у нас, ни в Open Library. */
export async function GET(req: Request, { params }: { params: Promise<{ isbn: string }> }) {
  const isbn = normalizeIsbn(decodeURIComponent((await params).isbn));
  if (!isbn) return apiError("Это не ISBN книги", 400);
  const book = await findByIsbn(isbn, await apiUserId(req));
  if (!book) return apiError("Книга с таким ISBN не найдена — добавьте её вручную", 404);
  return json({ book: bookJSON(book) });
}
