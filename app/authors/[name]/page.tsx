import { notFound } from "next/navigation";
import { getAuthor } from "@/lib/discover";
import { Plural } from "@/lib/plural";
import { BookRow } from "@/components/BookRow";

export default async function AuthorPage({ params }: { params: Promise<{ name: string }> }) {
  const author = await getAuthor(decodeURIComponent((await params).name));
  if (!author) notFound();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black">{author.name}</h1>
        <p className="mt-1 text-neutral-400">
          {author.books.length} {Plural.ru(author.books.length, "книга", "книги", "книг")} в каталоге
          {author.avgRating !== null && (
            <>
              {" · "}
              <span className="text-amber-400">★ {author.avgRating.toFixed(1)}</span> по {author.ratingsCount}{" "}
              {Plural.ru(author.ratingsCount, "оценке", "оценкам", "оценкам")}
            </>
          )}
          {author.readersCount > 0 && ` · прочитали ${author.readersCount} раз`}
        </p>
      </header>
      <div className="space-y-1">
        {author.books.map((b) => (
          <BookRow key={b.book.id} book={b.book}>
            {b.avgRating !== null && (
              <div className="mt-1 text-sm text-amber-400">
                ★ {b.avgRating.toFixed(1)} <span className="text-neutral-500">({b.ratingsCount})</span>
              </div>
            )}
          </BookRow>
        ))}
      </div>
    </div>
  );
}
