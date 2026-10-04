import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { STATUSES, STATUS_LABEL, isStatus, type Status } from "@/lib/status";
import { BookRow } from "@/components/BookRow";
import { ProgressBar } from "@/components/ProgressBar";
import { progressOf } from "@/lib/shelf";
import { genreName, isGenre } from "@/lib/genres";

const fmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" });

export default async function Home({ searchParams }: { searchParams: Promise<{ tab?: string; genre?: string }> }) {
  const session = await auth();
  if (!session?.user) return <Landing />;

  const { tab, genre: genreParam } = await searchParams;
  const active: Status = isStatus(tab) ? tab : "READING";
  const genre = isGenre(genreParam) ? genreParam : null;
  const href = (s: Status, g: string | null) => `/?tab=${s}${g ? `&genre=${g}` : ""}`;

  const [counts, entries] = await Promise.all([
    db.shelfEntry.groupBy({ by: ["status"], where: { userId: session.user.id }, _count: true }),
    db.shelfEntry.findMany({
      where: {
        userId: session.user.id,
        status: active,
        ...(genre ? { book: { genres: { some: { genreSlug: genre } } } } : {}),
      },
      include: { book: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  // Жанры, которые есть у книг на полке, — для фильтра.
  const shelfGenres = await db.bookGenre.groupBy({
    by: ["genreSlug"],
    where: { book: { entries: { some: { userId: session.user.id } } } },
    _count: true,
    orderBy: { _count: { genreSlug: "desc" } },
  });
  const countOf = (s: Status) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Мои книги</h1>
      <div className="mb-6 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={href(s, genre)}
            className={`rounded-full px-3 py-1 text-sm ${s === active ? "bg-amber-500 text-black" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"}`}
          >
            {STATUS_LABEL[s]} <span className="opacity-60">{countOf(s)}</span>
          </Link>
        ))}
      </div>

      {shelfGenres.length > 1 && (
        <div className="-mt-3 mb-5 flex flex-wrap gap-2 text-xs">
          <Link
            href={href(active, null)}
            className={`rounded-full px-2.5 py-1 ${genre === null ? "bg-neutral-200 text-black" : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"}`}
          >
            Все жанры
          </Link>
          {shelfGenres.map((g) => (
            <Link
              key={g.genreSlug}
              href={href(active, g.genreSlug)}
              className={`rounded-full px-2.5 py-1 ${genre === g.genreSlug ? "bg-neutral-200 text-black" : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"}`}
            >
              {genreName(g.genreSlug)}
            </Link>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-neutral-400">
          Здесь пока пусто. Найдите книгу через поиск сверху или{" "}
          <Link href="/import" className="text-amber-400 hover:underline">
            импортируйте библиотеку
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-1">
          {entries.map((e) => (
            <BookRow key={e.id} book={e.book}>
              <div className="mt-1 text-xs text-neutral-500">
                {e.startedAt && `Начал ${fmt.format(e.startedAt)}`}
                {e.startedAt && e.finishedAt && " · "}
                {e.finishedAt && `Закончил ${fmt.format(e.finishedAt)}`}
              </div>
              {e.rating && <div className="mt-1 text-sm text-amber-400">★ {e.rating}/10</div>}
              {progressOf(e, e.book) !== null && (
                <ProgressBar
                  value={progressOf(e, e.book)!}
                  label={`${e.currentPage} из ${e.totalPages ?? e.book.pageCount} стр.`}
                />
              )}
            </BookRow>
          ))}
        </div>
      )}
    </div>
  );
}

function Landing() {
  return (
    <div className="py-16 text-center">
      <h1 className="mb-4 text-4xl font-black">Ваша книжная полка</h1>
      <p className="mx-auto mb-8 max-w-md text-neutral-400">
        Отмечайте, что начали и закончили читать, ставьте оценки и пишите отзывы. Как IMDb, только для книг.
      </p>
      <div className="flex justify-center gap-3">
        <Link href="/register" className="btn-primary">
          Создать аккаунт
        </Link>
        <Link href="/search" className="btn-ghost">
          Искать книги
        </Link>
      </div>
    </div>
  );
}
