import { z } from "zod";
import { apiError, apiUserId, bookJSON, json, readJson, unauthorized } from "@/lib/api";
import { upsertFromOpenLibrary } from "@/lib/openlibrary";

const schema = z.object({
  key: z.string().regex(/^\/works\/OL\w+$/, "Некорректный ключ Open Library"),
  title: z.string().trim().min(1).max(300),
  author: z.string().trim().min(1).max(300),
  year: z.number().int().nullish().transform((v) => v ?? null),
  isbn: z.string().max(20).nullish().transform((v) => v ?? null),
  coverUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://covers.openlibrary.org/"), "Обложка не из Open Library")
    .nullish()
    .transform((v) => v ?? null),
});

/** Сохраняет книгу из результатов Open Library в каталог. */
export async function POST(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return apiError(parsed.error.issues[0].message);
  const book = await upsertFromOpenLibrary(parsed.data, userId);
  return json({ book: bookJSON(book) });
}
