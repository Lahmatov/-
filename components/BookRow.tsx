import Link from "next/link";
import { BookCover } from "./BookCover";

type Props = {
  book: { id: string; title: string; author: string; year: number | null; coverUrl: string | null };
  children?: React.ReactNode;
};

export function BookRow({ book, children }: Props) {
  return (
    <Link href={`/books/${book.id}`} className="flex gap-4 rounded-lg p-2 hover:bg-neutral-900">
      <BookCover title={book.title} coverUrl={book.coverUrl} />
      <div className="min-w-0">
        <div className="font-semibold">{book.title}</div>
        <div className="text-sm text-neutral-400">
          {book.author}
          {book.year ? ` · ${book.year}` : ""}
        </div>
        {children}
      </div>
    </Link>
  );
}
