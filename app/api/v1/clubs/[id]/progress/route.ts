import { apiError, apiUserId, json, readJson, unauthorized } from "@/lib/api";
import { membership, setChapter } from "@/lib/clubs";
import { chapterSchema, firstIssue } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

/** { chapter } — до какой главы я дочитал (0 — ещё не начал). */
export async function PUT(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const id = (await params).id;
  const parsed = chapterSchema.safeParse(await readJson(req));
  if (!parsed.success) return apiError(firstIssue(parsed.error));
  if (!(await membership(id, userId))) return apiError("Клуб не найден", 404);
  const member = await setChapter(id, userId, parsed.data.chapter);
  return json({ chapter: member.chapter });
}
