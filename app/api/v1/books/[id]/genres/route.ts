import { z } from "zod";
import { apiError, apiUserId, json, readJson, unauthorized } from "@/lib/api";
import { addGenres, bookGenres, isGenre } from "@/lib/genres";
import { bookExists } from "@/lib/shelf";

/** Читатель отмечает жанр книги: { slug }. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const { id } = await params;
  const parsed = z.object({ slug: z.string() }).safeParse(await readJson(req));
  if (!parsed.success || !isGenre(parsed.data.slug)) return apiError("Неизвестный жанр");
  if (!(await bookExists(id))) return apiError("Книга не найдена", 404);
  await addGenres(id, [parsed.data.slug], userId);
  return json({ genres: await bookGenres(id) });
}
