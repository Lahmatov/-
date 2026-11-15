import { findByIsbn, searchBooks } from "@/lib/books";
import { normalizeIsbn } from "@/lib/isbn";
import { searchOpenLibrary } from "@/lib/openlibrary";
import { apiUserId, bookJSON, json } from "@/lib/api";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return json({ local: [], openLibrary: [] });
  // Ввели ISBN — ищем именно эту книгу.
  const isbn = normalizeIsbn(q);
  if (isbn) {
    const book = await findByIsbn(isbn, await apiUserId(req));
    return json({ local: book ? [bookJSON(book)] : [], openLibrary: [] });
  }
  const [local, remote] = await Promise.all([searchBooks(q), searchOpenLibrary(q)]);
  const localKeys = new Set(local.map((b) => b.openLibraryKey).filter(Boolean));
  return json({ local: local.map(bookJSON), openLibrary: remote.filter((h) => !localKeys.has(h.key)) });
}
