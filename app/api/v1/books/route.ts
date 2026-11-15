import { apiError, apiUserId, bookJSON, json, readJson, unauthorized } from "@/lib/api";
import { createBook } from "@/lib/shelf";
import { bookJsonSchema, firstIssue } from "@/lib/validation";

/** Ручное добавление книги. Если такая уже есть — возвращает её с existing: true. */
export async function POST(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const parsed = bookJsonSchema.safeParse(await readJson(req));
  if (!parsed.success) return apiError(firstIssue(parsed.error));
  const { book, existing } = await createBook(userId, parsed.data);
  return json({ book: bookJSON(book), existing }, existing ? 200 : 201);
}
