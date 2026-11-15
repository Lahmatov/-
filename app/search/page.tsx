import Link from "next/link";
import { auth } from "@/auth";
import { findByIsbn, searchBooks } from "@/lib/books";
import { normalizeIsbn } from "@/lib/isbn";
import { searchOpenLibrary } from "@/lib/openlibrary";
import { importFromOpenLibrary } from "@/lib/actions";
import { BookRow } from "@/components/BookRow";
import { BookCover } from "@/components/BookCover";
import { SubmitButton } from "@/components/SubmitButton";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q?.trim() ?? "";
  const session = await auth();

  if (!q) {
    return (
      <form className="space-y-3">
        <h1 className="text-2xl font-bold">Поиск книг</h1>
        <input name="q" autoFocus placeholder="Название или автор…" className="input" />
      </form>
    );
  }

  // Ввели ISBN (например, с обложки) — сразу ищем эту книгу.
  const isbn = normalizeIsbn(q);
  const [local, remote] = isbn
    ? [await findByIsbn(isbn, session?.user?.id ?? null).then((b) => (b ? [b] : [])), []]
    : await Promise.all([searchBooks(q), searchOpenLibrary(q)]);
  const localKeys = new Set(local.map((b) => b.openLibraryKey).filter(Boolean));
  const extra = remote.filter((h) => !localKeys.has(h.key));

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-3 text-2xl font-bold">«{q}»</h1>
        {local.length === 0 ? (
          <p className="text-neutral-400">В нашем каталоге ничего не нашлось.</p>
        ) : (
          <div className="space-y-1">
            {local.map((b) => (
              <BookRow key={b.id} book={b} />
            ))}
          </div>
        )}
      </section>

      {extra.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-neutral-300">Найдено в Open Library</h2>
          <div className="space-y-2">
            {extra.map((h) => (
              <div key={h.key} className="flex items-center gap-4 rounded-lg p-2">
                <BookCover title={h.title} coverUrl={h.coverUrl} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{h.title}</div>
                  <div className="text-sm text-neutral-400">
                    {h.author}
                    {h.year ? ` · ${h.year}` : ""}
                  </div>
                </div>
                {session?.user && (
                  <form action={importFromOpenLibrary}>
                    {Object.entries(h).map(([k, v]) => (
                      <input key={k} type="hidden" name={k} value={v ?? ""} />
                    ))}
                    <SubmitButton className="btn-ghost">Добавить</SubmitButton>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-lg border border-dashed border-neutral-700 p-4">
        <p className="mb-3 text-neutral-400">Не нашли нужную книгу?</p>
        <Link href={session?.user ? `/books/new?title=${encodeURIComponent(q)}` : "/login"} className="btn-primary">
          Добавить книгу вручную
        </Link>
      </section>
    </div>
  );
}
