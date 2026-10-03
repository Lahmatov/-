import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getYearStats, parseYear } from "@/lib/stats";
import { Plural } from "@/lib/plural";
import { GoalForm } from "@/components/GoalForm";
import { MonthChart } from "@/components/MonthChart";

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const stats = await getYearStats(session.user.id, parseYear((await searchParams).year));
  const progress = stats.goal ? Math.min(1, stats.readCount / stats.goal) : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-2xl font-bold">Итоги</h1>
        {stats.years.map((y) => (
          <Link
            key={y}
            href={`/stats?year=${y}`}
            className={`rounded-full px-3 py-1 text-sm ${y === stats.year ? "bg-amber-500 text-black" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"}`}
          >
            {y}
          </Link>
        ))}
      </div>

      <section className="space-y-3 rounded-xl bg-neutral-900 p-4">
        <div className="text-4xl font-black">
          {stats.readCount}
          {stats.goal && <span className="text-neutral-500"> / {stats.goal}</span>}
        </div>
        <p className="text-neutral-400">
          {Plural.ru(stats.readCount, "книга прочитана", "книги прочитано", "книг прочитано")} в {stats.year} году
          {stats.goal && stats.readCount >= stats.goal && " — цель выполнена!"}
        </p>
        {stats.goal && (
          <div
            className="h-2 overflow-hidden rounded-full bg-neutral-800"
            role="progressbar"
            aria-valuenow={stats.readCount}
            aria-valuemin={0}
            aria-valuemax={stats.goal}
            aria-label="Прогресс цели"
          >
            <div className="h-full rounded-full bg-amber-500" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
        <GoalForm key={stats.year} year={stats.year} goal={stats.goal} />
      </section>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-neutral-900 p-4">
          <div className="text-2xl font-bold">{stats.avgRating ?? "—"}</div>
          <div className="text-sm text-neutral-500">средняя оценка за год</div>
        </div>
        <div className="rounded-xl bg-neutral-900 p-4">
          <div className="text-2xl font-bold">{stats.readingNow}</div>
          <div className="text-sm text-neutral-500">читаю сейчас</div>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Прочитано по месяцам</h2>
        {stats.readCount === 0 ? (
          <p className="text-neutral-500">В {stats.year} году пока нет прочитанных книг.</p>
        ) : (
          <MonthChart byMonth={stats.byMonth} />
        )}
      </section>
    </div>
  );
}
