import { db } from "./db";
import { makeInviteCode, normalizeInviteCode } from "./clubs";

// Челленджи: «N книг за период», прогресс считается по полке участника.

export type ChallengePhase = "upcoming" | "active" | "finished";

export function phaseOf(c: { startsAt: Date; endsAt: Date }, now = new Date()): ChallengePhase {
  if (now < c.startsAt) return "upcoming";
  if (now > c.endsAt) return "finished";
  return "active";
}

type ChallengeScope = { id: string; startsAt: Date; endsAt: Date; genreSlug: string | null };

/** Сколько книг прочитал каждый из участников за период челленджа (и в его жанре, если задан). */
export async function progressFor(c: ChallengeScope, userIds: string[]): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const rows = await db.shelfEntry.groupBy({
    by: ["userId"],
    where: {
      userId: { in: userIds },
      status: "READ",
      finishedAt: { gte: c.startsAt, lte: c.endsAt },
      ...(c.genreSlug ? { book: { genres: { some: { genreSlug: c.genreSlug } } } } : {}),
    },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.userId, r._count._all]));
}

export type ChallengeInput = {
  title: string;
  description: string | null;
  goal: number;
  startsAt: Date;
  endsAt: Date;
  genreSlug: string | null;
  isPublic: boolean;
};

export async function createChallenge(userId: string, input: ChallengeInput) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.challenge.create({
        data: { ...input, ownerId: userId, inviteCode: makeInviteCode(), participants: { create: { userId } } },
      });
    } catch (e) {
      if (attempt >= 3 || !(e instanceof Error && e.message.includes("inviteCode"))) throw e;
    }
  }
}

const withMeta = {
  genre: true,
  _count: { select: { participants: true } },
} as const;

/** Мои челленджи с моим прогрессом и открытые публичные, в которые можно вступить. */
export async function listChallenges(userId: string) {
  const now = new Date();
  const [mine, open] = await Promise.all([
    db.challenge.findMany({
      where: { participants: { some: { userId } } },
      include: withMeta,
      orderBy: { endsAt: "desc" },
      take: 100,
    }),
    db.challenge.findMany({
      where: { isPublic: true, endsAt: { gte: now }, participants: { none: { userId } } },
      include: withMeta,
      orderBy: [{ participants: { _count: "desc" } }, { createdAt: "desc" }],
      take: 30,
    }),
  ]);
  const progress = await Promise.all(mine.map(async (c) => (await progressFor(c, [userId])).get(userId) ?? 0));
  return {
    mine: mine.map((c, i) => ({ ...c, myProgress: progress[i] })),
    open: open.map((c) => ({ ...c, myProgress: null })),
  };
}

/** Челлендж с таблицей участников; null — нет такого или закрытый, а пользователь не участник. */
export async function challengeDetails(id: string, userId: string) {
  const challenge = await db.challenge.findUnique({
    where: { id },
    include: {
      ...withMeta,
      participants: { include: { user: { select: { id: true, name: true } } }, take: 500 },
    },
  });
  if (!challenge) return null;
  const isMember = challenge.participants.some((p) => p.userId === userId);
  if (!challenge.isPublic && !isMember) return null;
  const progress = await progressFor(challenge, challenge.participants.map((p) => p.userId));
  const leaderboard = challenge.participants
    .map((p) => ({ user: p.user, progress: progress.get(p.userId) ?? 0 }))
    .sort((a, b) => b.progress - a.progress || (a.user.name ?? "").localeCompare(b.user.name ?? ""));
  return { challenge, isMember, leaderboard, myProgress: progress.get(userId) ?? 0 };
}

export async function joinChallenge(id: string, userId: string) {
  const challenge = await db.challenge.findUnique({ where: { id } });
  if (!challenge || !challenge.isPublic) return null;
  if (phaseOf(challenge) === "finished") return "FINISHED" as const;
  await db.challengeParticipant.upsert({
    where: { challengeId_userId: { challengeId: id, userId } },
    create: { challengeId: id, userId },
    update: {},
  });
  return challenge;
}

export async function joinChallengeByCode(code: string, userId: string) {
  const challenge = await db.challenge.findUnique({ where: { inviteCode: normalizeInviteCode(code) } });
  if (!challenge) return null;
  if (phaseOf(challenge) === "finished") return "FINISHED" as const;
  await db.challengeParticipant.upsert({
    where: { challengeId_userId: { challengeId: challenge.id, userId } },
    create: { challengeId: challenge.id, userId },
    update: {},
  });
  return challenge;
}

/** Выйти; последний участник удаляет челлендж. */
export async function leaveChallenge(id: string, userId: string) {
  const { count } = await db.challengeParticipant.deleteMany({ where: { challengeId: id, userId } });
  if (count === 0) return false;
  if ((await db.challengeParticipant.count({ where: { challengeId: id } })) === 0) {
    await db.challenge.delete({ where: { id } });
  }
  return true;
}

/** Значки: челленджи, в которых пользователь набрал цель. */
export async function badges(userId: string) {
  const joined = await db.challenge.findMany({
    where: { participants: { some: { userId } } },
    orderBy: { endsAt: "desc" },
    take: 200,
  });
  const result = [];
  for (const c of joined) {
    const progress = (await progressFor(c, [userId])).get(userId) ?? 0;
    if (progress >= c.goal) result.push({ id: c.id, title: c.title, goal: c.goal, endsAt: c.endsAt, progress });
  }
  return result;
}
