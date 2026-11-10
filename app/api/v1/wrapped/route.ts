import { apiUserId, bookJSON, json, unauthorized } from "@/lib/api";
import { parseYear } from "@/lib/stats";
import { getWrapped } from "@/lib/wrapped";
import { langOf } from "@/lib/i18n";

/** Итоги года: ?year=2026. */
export async function GET(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const w = await getWrapped(userId, parseYear(new URL(req.url).searchParams.get("year")), langOf(req));
  return json({
    ...w,
    bestBook: w.bestBook && { book: bookJSON(w.bestBook.book), rating: w.bestBook.rating },
    longestBook: w.longestBook && { book: bookJSON(w.longestBook.book), pages: w.longestBook.pages },
    firstBook: w.firstBook && bookJSON(w.firstBook),
  });
}
