import { apiError, apiUserId, bookJSON, json, readJson, unauthorized } from "@/lib/api";
import { upsertFromOpenLibrary } from "@/lib/openlibrary";
import { openLibraryHitSchema } from "@/lib/validation";

/** Сохраняет книгу из результатов Open Library в каталог. */
export async function POST(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const parsed = openLibraryHitSchema.safeParse(await readJson(req));
  if (!parsed.success) return apiError(parsed.error.issues[0].message);
  const book = await upsertFromOpenLibrary(parsed.data, userId);
  return json({ book: bookJSON(book) });
}
