import { apiError, apiUserId, challengeJSON, json, publicUserJSON, unauthorized } from "@/lib/api";
import { challengeDetails } from "@/lib/challenges";
import { db } from "@/lib/db";
import { langOf } from "@/lib/i18n";

type Ctx = { params: Promise<{ id: string }> };

/** Челлендж и таблица участников. Код приглашения видят только участники. */
export async function GET(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const details = await challengeDetails((await params).id, userId);
  if (!details) return apiError("Челлендж не найден", 404);
  const { challenge, isMember, leaderboard, myProgress } = details;
  return json({
    challenge: {
      ...challengeJSON({ ...challenge, myProgress: isMember ? myProgress : null }, userId, langOf(req)),
      isMember,
      inviteCode: isMember ? challenge.inviteCode : null,
      leaderboard: leaderboard.map((row) => ({
        user: publicUserJSON(row.user),
        progress: row.progress,
        completed: row.progress >= challenge.goal,
      })),
    },
  });
}

/** Создатель удаляет челлендж. */
export async function DELETE(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const id = (await params).id;
  const challenge = await db.challenge.findUnique({ where: { id } });
  if (!challenge) return apiError("Челлендж не найден", 404);
  if (challenge.ownerId !== userId) return apiError("Удалить челлендж может только создатель", 403);
  await db.challenge.delete({ where: { id } });
  return json({ ok: true });
}
