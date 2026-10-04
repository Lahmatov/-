import { apiUserId, json, quoteJSON, unauthorized } from "@/lib/api";
import { myQuotes } from "@/lib/quotes";

/** Мои цитаты по всем книгам, новые сверху. ?cursor=<id последней> — следующая страница. */
export async function GET(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const cursor = new URL(req.url).searchParams.get("cursor") ?? undefined;
  const take = 50;
  const quotes = await myQuotes(userId, cursor, take);
  return json({
    quotes: quotes.map((q) => quoteJSON(q, userId)),
    nextCursor: quotes.length === take ? quotes[quotes.length - 1].id : null,
  });
}
