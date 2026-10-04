import { z } from "zod";
import { apiError, apiUserId, json, readJson, unauthorized } from "@/lib/api";
import { isReportReason, report } from "@/lib/moderation";

/** Жалоба: { entryId | commentId, reason: SPAM | ABUSE | SPOILER | OTHER }. */
export async function POST(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const parsed = z
    .object({ entryId: z.string().optional(), commentId: z.string().optional(), reason: z.string() })
    .safeParse(await readJson(req));
  if (!parsed.success || !isReportReason(parsed.data.reason)) return apiError("Некорректная жалоба");
  const ok = await report(userId, { entryId: parsed.data.entryId, commentId: parsed.data.commentId }, parsed.data.reason);
  if (!ok) return apiError("Не найдено", 404);
  return json({ ok: true });
}
