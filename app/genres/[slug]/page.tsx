import Link from "next/link";
import { notFound } from "next/navigation";
import { booksInGenre, topRated } from "@/lib/discover";
import { genreName, isGenre } from "@/lib/genres";
import { BookRow } from "@/components/BookRow";

export default async function GenrePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isGenre(slug)) notFound();
  const [best, all] = await Promise.all([topRated(5, slug), booksInGenre(slug)]);
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-black">{genreName(slug)}</h1>
      {best.length > 0 && (
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Лучшее в жанре</h2>
            <Link href={`/top?genre=${slug}`} className="text-sm text-amber-400 hover:underline">
              Весь топ
            </Link>
          </div>
          {best.map((r) => (
            <BookRow key={r.book.id} book={r.book}>
              <div className="mt-1 text-sm text-amber-400">★ {r.avgRating?.toFixed(1)}</div>
            </BookRow>
          ))}
        </section>
      )}
      <section>
        <h2 className="mb-2 text-lg font-semibold">Все книги</h2>
        {all.length === 0 ? (
          <p className="text-neutral-500">Пока ни одной книги. Жанр можно отметить на странице книги.</p>
        ) : (
          all.map((b) => <BookRow key={b.id} book={b} />)
        )}
      </section>
    </div>
  );
}
