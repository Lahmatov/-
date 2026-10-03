import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { recommendations, topRated, trending } from "@/lib/discover";
import { GENRES } from "@/lib/genres";
import { Plural } from "@/lib/plural";
import { BookRow } from "@/components/BookRow";

export default async function DiscoverPage() {
  const session = await auth();
  const [recs, top, hot, genreCounts] = await Promise.all([
    session?.user ? recommendations(session.user.id, 8) : [],
    topRated(8),
    trending(8),
    db.bookGenre.groupBy({ by: ["genreSlug"], _count: true }),
  ]);
  const count = (slug: string) => genreCounts.find((g) => g.genreSlug === slug)?._count ?? 0;

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold">Обзор</h1>

      {session?.user && (
        <section>
          <h2 className="mb-1 text-lg font-semibold">Что почитать дальше</h2>
          <p className="mb-3 text-sm text-neutral-500">
            Подбираем по вашим оценкам: книги, которые высоко оценили читатели с похожим вкусом.
          </p>
          {recs.length === 0 ? (
            <p className="text-neutral-500">Поставьте оценки нескольким книгам — и здесь появятся рекомендации.</p>
          ) : (
            recs.map((r) => (
              <BookRow key={r.book.id} book={r.book}>
                <div className="mt-1 text-xs text-neutral-500">{r.reason}</div>
              </BookRow>
            ))
          )}
        </section>
      )}

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Лучшие по оценкам</h2>
          <Link href="/top" className="text-sm text-amber-400 hover:underline">
            Весь топ
          </Link>
        </div>
        {top.length === 0 ? (
          <p className="text-neutral-500">Пока нет оценок.</p>
        ) : (
          top.map((r) => (
            <BookRow key={r.book.id} book={r.book}>
              <div className="mt-1 text-sm text-amber-400">
                ★ {r.avgRating?.toFixed(1)} <span className="text-neutral-500">({r.ratingsCount})</span>
              </div>
            </BookRow>
          ))
        )}
      </section>

      {hot.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Популярное за месяц</h2>
          {hot.map((t) => (
            <BookRow key={t.book.id} book={t.book}>
              <div className="mt-1 text-xs text-neutral-500">
                добавили на полку {t.count} {Plural.ru(t.count, "раз", "раза", "раз")}
              </div>
            </BookRow>
          ))}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Жанры</h2>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <Link key={g.slug} href={`/genres/${g.slug}`} className="rounded-full bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700">
              {g.name} <span className="text-neutral-500">{count(g.slug)}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
