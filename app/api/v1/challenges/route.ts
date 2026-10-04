import { apiError, apiUserId, challengeJSON, json, readJson, unauthorized } from "@/lib/api";
import { createChallenge, listChallenges } from "@/lib/challenges";
import { db } from "@/lib/db";
import { langOf } from "@/lib/i18n";
import { challengeSchema, firstIssue } from "@/lib/validation";

/** { mine, open } — мои челленджи с прогрессом и публичные, в которые можно вступить. */
export async function GET(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const lang = langOf(req);
  const { mine, open } = await listChallenges(userId);
  return json({
    mine: mine.map((c) => challengeJSON(c, userId, lang)),
    open: open.map((c) => challengeJSON(c, userId, lang)),
  });
}

/** { title, description?, goal, startsAt, endsAt, genre?, isPublic? } — даты "YYYY-MM-DD". */
export async function POST(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const parsed = challengeSchema.safeParse(await readJson(req));
  if (!parsed.success) return apiError(firstIssue(parsed.error));
  if (parsed.data.genreSlug && !(await db.genre.findUnique({ where: { slug: parsed.data.genreSlug } }))) {
    return apiError("Нет такого жанра");
  }
  const challenge = await createChallenge(userId, parsed.data);
  return json({ challenge: { id: challenge.id, inviteCode: challenge.inviteCode } }, 201);
}
