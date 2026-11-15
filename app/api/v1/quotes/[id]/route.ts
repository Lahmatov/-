import { apiError, apiUserId, json, quoteJSON, readJson, unauthorized } from "@/lib/api";
import { deleteQuote, updateQuote } from "@/lib/quotes";
import { firstIssue, quotePatchSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const parsed = quotePatchSchema.safeParse(await readJson(req));
  if (!parsed.success) return apiError(firstIssue(parsed.error));
  const quote = await updateQuote(userId, (await params).id, parsed.data);
  if (!quote) return apiError("Цитата не найдена", 404);
  return json({ quote: quoteJSON(quote, userId) });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  if (!(await deleteQuote(userId, (await params).id))) return apiError("Цитата не найдена", 404);
  return json({ ok: true });
}
