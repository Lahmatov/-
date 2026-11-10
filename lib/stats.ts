import { db } from "./db";

export type YearStats = {
  year: number;
  goal: number | null;
  readCount: number;
  /** Сколько книг закончено в каждом месяце (январь — индекс 0), по UTC, как и даты в формах. */
  byMonth: number[];
  avgRating: number | null;
  readingNow: number;
  /** Годы, в которые есть прочитанные книги, плюс текущий — для переключателя. */
  years: number[];
};

export async function getYearStats(userId: string, year: number): Promise<YearStats> {
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year + 1, 0, 1));
  const [finished, goal, readingNow, allFinished] = await Promise.all([
    db.shelfEntry.findMany({
      where: { userId, status: "READ", finishedAt: { gte: from, lt: to } },
      select: { finishedAt: true, rating: true },
    }),
    db.readingGoal.findUnique({ where: { userId_year: { userId, year } } }),
    db.shelfEntry.count({ where: { userId, status: "READING" } }),
    db.shelfEntry.findMany({
      where: { userId, status: "READ", finishedAt: { not: null } },
      select: { finishedAt: true },
    }),
  ]);

  const byMonth = new Array<number>(12).fill(0);
  for (const e of finished) if (e.finishedAt) byMonth[e.finishedAt.getUTCMonth()]++;
  const ratings = finished.map((e) => e.rating).filter((r): r is number => r !== null);
  const years = new Set(allFinished.map((e) => e.finishedAt!.getUTCFullYear()));
  years.add(new Date().getUTCFullYear());
  years.add(year);

  return {
    year,
    goal: goal?.target ?? null,
    readCount: finished.length,
    byMonth,
    avgRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
    readingNow,
    years: [...years].sort((a, b) => b - a),
  };
}

/** target = null убирает цель. */
export async function setGoal(userId: string, year: number, target: number | null) {
  if (target === null) {
    await db.readingGoal.deleteMany({ where: { userId, year } });
    return;
  }
  await db.readingGoal.upsert({
    where: { userId_year: { userId, year } },
    create: { userId, year, target },
    update: { target },
  });
}

export function parseYear(value: string | null | undefined): number {
  const year = Number(value);
  const current = new Date().getUTCFullYear();
  return Number.isInteger(year) && year >= 1900 && year <= current + 1 ? year : current;
}
