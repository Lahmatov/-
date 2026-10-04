import Link from "next/link";
import { topRated } from "@/lib/discover";
import { GENRES, genreName, isGenre } from "@/lib/genres";
import { Plural } from "@/lib/plural";
import { BookRow } from "@/components/BookRow";

export default async function TopPage({ searchParams }: { searchParams: Promise<{ genre?: string }> }) {
  const { genre: param } = await searchParams;
  const genre = isGenre(param) ? param : null;
  const top = await topRated(50, genre);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Лучшие книги{genre ? ` · ${genreName(genre)}` : ""}</h1>
      <p className="text-sm text-neutral-500">
        Рейтинг взвешенный, как в топе IMDb: у книги с парой оценок средняя тянется к общей, поэтому одна «десятка» не
        обгонит книгу с сотней «девяток».
      </p>
      <div className="flex flex-wrap gap-2 text-xs">
        <Link
          href="/top"
          className={`rounded-full px-2.5 py-1 ${!genre ? "bg-amber-500 text-black" : "bg-neutral-800 text-neutral-300"}`}
        >
          Все жанры
        </Link>
        {GENRES.map((g) => (
          <Link
            key={g.slug}
            href={`/top?genre=${g.slug}`}
            className={`rounded-full px-2.5 py-1 ${genre === g.slug ? "bg-amber-500 text-black" : "bg-neutral-800 text-neutral-300"}`}
          >
            {g.name}
          </Link>
        ))}
      </div>
      {top.length === 0 ? (
        <p className="text-neutral-500">Пока нет оценок.</p>
      ) : (
        <ol className="space-y-1">
          {top.map((r, i) => (
            <li key={r.book.id} className="flex items-center gap-2">
              <span className="w-8 text-right text-lg font-bold text-neutral-500">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <BookRow book={r.book}>
                  <div className="mt-1 text-sm text-amber-400">
                    ★ {r.avgRating?.toFixed(1)}{" "}
                    <span className="text-neutral-500">
                      ({r.ratingsCount} {Plural.ru(r.ratingsCount, "оценка", "оценки", "оценок")})
                    </span>
                  </div>
                </BookRow>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
