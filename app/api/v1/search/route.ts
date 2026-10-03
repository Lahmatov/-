import { searchBooks } from "@/lib/books";
import { searchOpenLibrary } from "@/lib/openlibrary";
import { bookJSON, json } from "@/lib/api";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return json({ local: [], openLibrary: [] });
  const [local, remote] = await Promise.all([searchBooks(q), searchOpenLibrary(q)]);
  const localKeys = new Set(local.map((b) => b.openLibraryKey).filter(Boolean));
  return json({ local: local.map(bookJSON), openLibrary: remote.filter((h) => !localKeys.has(h.key)) });
}
