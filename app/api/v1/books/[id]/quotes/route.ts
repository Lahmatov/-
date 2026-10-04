import { apiError, apiUserId, json, quoteJSON, readJson, unauthorized } from "@/lib/api";
import { addQuote, bookQuotes } from "@/lib/quotes";
import { bookExists } from "@/lib/shelf";
import { firstIssue, quoteSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

/** Цитаты к книге: { mine, others } — свои и публичные чужие. */
export async function GET(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const { id } = await params;
  if (!(await bookExists(id))) return apiError("Книга не найдена", 404);
  const { mine, others } = await bookQuotes(id, userId);
  return json({ mine: mine.map((q) => quoteJSON(q, userId)), others: others.map((q) => quoteJSON(q, userId)) });
}

/** { text, page?, note?, isPublic? } */
export async function POST(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const { id } = await params;
  const parsed = quoteSchema.safeParse(await readJson(req));
  if (!parsed.success) return apiError(firstIssue(parsed.error));
  if (!(await bookExists(id))) return apiError("Книга не найдена", 404);
  const quote = await addQuote(userId, id, parsed.data);
  return json({ quote: quoteJSON(quote, userId) }, 201);
}
