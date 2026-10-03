import { apiError, apiUserId, json, unauthorized } from "@/lib/api";
import { parseBooksCsv, parseKindleClippings, type ImportedBook } from "@/lib/importers";
import { importBooks } from "@/lib/shelf";

/** multipart/form-data: file + kind ("kindle" | "csv"). */
export async function POST(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return apiError("Нет файла");
  if (file.size > 10 * 1024 * 1024) return apiError("Файл больше 10 МБ", 413);

  let items: ImportedBook[];
  try {
    const text = await file.text();
    items = form?.get("kind") === "kindle" ? parseKindleClippings(text) : parseBooksCsv(text);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Не удалось прочитать файл");
  }
  if (items.length === 0) return apiError("В файле не найдено ни одной книги");
  return json(await importBooks(userId, items));
}
