import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getBookDetails, progressOf } from "@/lib/shelf";
import { db } from "@/lib/db";
import { GENRES } from "@/lib/genres";
import { AuthorLinks } from "@/components/AuthorLinks";
import { ProgressBar } from "@/components/ProgressBar";
import { ProgressForm } from "@/components/ProgressForm";
import { STATUS_LABEL, isStatus, type Status } from "@/lib/status";
import Link from "next/link";
import { addGenreAction, removeFromShelf, removeGenreAction, setStatus, toggleListItem } from "@/lib/actions";
import { getMyLists } from "@/lib/lists";
import { ListForm } from "@/components/ListForm";
import { BookCover } from "@/components/BookCover";
import { ReviewForm } from "@/components/ReviewForm";
import { SubmitButton } from "@/components/SubmitButton";

const fmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" });

const dateInput = (d: Date | null) => d?.toISOString().slice(0, 10) ?? "";

// Какие действия показывать в зависимости от текущего статуса.
const ACTIONS: Record<Status | "NONE", { status: Status; label: string }[]> = {
  NONE: [
    { status: "READING", label: "Начал читать" },
    { status: "WANT", label: "Хочу прочитать" },
    { status: "READ", label: "Уже прочитал" },
  ],
  WANT: [
    { status: "READING", label: "Начал читать" },
    { status: "READ", label: "Уже прочитал" },
  ],
  READING: [
    { status: "READ", label: "Закончил читать" },
    { status: "PAUSED", label: "Отложить" },
    { status: "DROPPED", label: "Бросил" },
  ],
  PAUSED: [
    { status: "READING", label: "Продолжить" },
    { status: "READ", label: "Закончил читать" },
    { status: "DROPPED", label: "Бросил" },
  ],
  READ: [{ status: "READING", label: "Перечитать" }],
  DROPPED: [{ status: "READING", label: "Начать заново" }],
};

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ existing?: string }>;
}) {
  const { id } = await params;
  const { existing } = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;

  const details = await getBookDetails(id, userId ?? null);
  if (!details) notFound();
  const { book, mine, stats, reviews, genres } = details;
  const myGenreSlugs = new Set(
    userId
      ? (await db.bookGenre.findMany({ where: { bookId: book.id, addedById: userId }, select: { genreSlug: true } })).map(
          (g) => g.genreSlug,
        )
      : [],
  );
  const myLists = userId ? await getMyLists(userId, book.id) : null;
  const inLists = myLists?.filter((l) => l.containsBook).length ?? 0;
  const myStatus = mine && isStatus(mine.status) ? mine.status : null;

  return (
    <div className="space-y-8">
      {existing && (
        <p className="rounded-lg bg-neutral-900 p-3 text-sm text-neutral-300">Такая книга уже есть в каталоге — вот она.</p>
      )}

      <div className="flex flex-col gap-6 sm:flex-row">
        <BookCover title={book.title} coverUrl={book.coverUrl} size="lg" />
        <div className="space-y-3">
          <h1 className="text-3xl font-black">{book.title}</h1>
          <p className="text-lg text-neutral-300">
            <AuthorLinks author={book.author} />
            {book.year ? ` · ${book.year}` : ""}
            {book.pageCount ? ` · ${book.pageCount} стр.` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {genres.map((g) => (
              <span key={g.slug} className="flex items-center gap-1 rounded-full bg-neutral-800 px-3 py-1 text-xs">
                <Link href={`/genres/${g.slug}`} className="hover:text-amber-400">
                  {g.name}
                </Link>
                {myGenreSlugs.has(g.slug) && (
                  <form action={removeGenreAction.bind(null, book.id, g.slug)}>
                    <button className="text-neutral-500 hover:text-red-400" aria-label={`Убрать жанр ${g.name}`}>
                      ×
                    </button>
                  </form>
                )}
              </span>
            ))}
            {userId && (
              <form action={addGenreAction.bind(null, book.id)} className="flex items-center gap-1">
                <select name="slug" className="input w-auto py-1 text-xs" aria-label="Добавить жанр" defaultValue="">
                  <option value="" disabled>
                    + жанр
                  </option>
                  {GENRES.filter((g) => !genres.some((x) => x.slug === g.slug)).map((g) => (
                    <option key={g.slug} value={g.slug}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <SubmitButton className="btn-ghost px-2 py-1 text-xs">ОК</SubmitButton>
              </form>
            )}
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <div className="text-2xl font-bold text-amber-400">
                {stats.avgRating ? `★ ${stats.avgRating.toFixed(1)}` : "—"}
              </div>
              <div className="text-neutral-500">{stats.ratingsCount} оценок</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.readersCount}</div>
              <div className="text-neutral-500">прочитали</div>
            </div>
          </div>
          {book.isbn && <p className="text-xs text-neutral-500">ISBN {book.isbn}</p>}
        </div>
      </div>

      {userId ? (
        <section className="space-y-4 rounded-xl bg-neutral-900 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {myStatus && (
              <span className="mr-2 rounded-full bg-amber-500/20 px-3 py-1 text-sm text-amber-300">
                {STATUS_LABEL[myStatus]}
              </span>
            )}
            {ACTIONS[myStatus ?? "NONE"].map((a) => (
              <form key={a.status} action={setStatus.bind(null, book.id, a.status)}>
                <SubmitButton className={a === ACTIONS[myStatus ?? "NONE"][0] ? "btn-primary" : "btn-ghost"}>
                  {a.label}
                </SubmitButton>
              </form>
            ))}
            {mine && (
              <form action={removeFromShelf.bind(null, book.id)} className="ml-auto">
                <SubmitButton className="btn text-neutral-500 hover:text-red-400">Убрать с полки</SubmitButton>
              </form>
            )}
          </div>
          {mine && (mine.status === "READING" || mine.status === "PAUSED") && (
            <div className="space-y-1">
              <ProgressForm bookId={book.id} currentPage={mine.currentPage} totalPages={mine.totalPages ?? book.pageCount} />
              {progressOf(mine, book) !== null && (
                <ProgressBar value={progressOf(mine, book)!} />
              )}
            </div>
          )}
          {mine && (
            <ReviewForm
              // Кнопки статуса меняют даты — пересоздаём форму, чтобы поля показали новые значения.
              // Даты меняются только вместе со статусом, а ключ по датам сбрасывал бы «Сохранено».
              key={mine.status}
              bookId={book.id}
              entry={{
                rating: mine.rating,
                review: mine.review,
                isPublic: mine.isPublic,
                startedAt: dateInput(mine.startedAt),
                finishedAt: dateInput(mine.finishedAt),
              }}
            />
          )}
        </section>
      ) : (
        <p className="text-neutral-400">
          <Link href="/login" className="text-amber-400 hover:underline">Войдите</Link>, чтобы отмечать прочитанное и писать отзывы.
        </p>
      )}

      {userId && myLists && (
        <details className="rounded-xl bg-neutral-900 p-4">
          <summary className="cursor-pointer font-semibold">
            В списки{inLists > 0 && <span className="ml-2 text-sm text-neutral-400">в {inLists}</span>}
          </summary>
          <div className="mt-3 space-y-2">
            {myLists.map((l) => (
              <form key={l.id} action={toggleListItem.bind(null, l.id, book.id, !l.containsBook)} className="flex items-center gap-3">
                <SubmitButton className={l.containsBook ? "btn-primary py-1" : "btn-ghost py-1"}>
                  {l.containsBook ? "✓" : "+"}
                </SubmitButton>
                <Link href={`/lists/${l.id}`} className="hover:underline">
                  {l.title}
                </Link>
              </form>
            ))}
            <div className="pt-2">
              <ListForm mode="create" bookId={book.id} />
            </div>
          </div>
        </details>
      )}

      <section>
        <h2 className="mb-3 text-xl font-bold">Отзывы читателей</h2>
        {reviews.length === 0 ? (
          <p className="text-neutral-500">Пока никто не оставил отзыв.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <article key={r.id} className="rounded-lg border border-neutral-800 p-4">
                <div className="mb-2 flex items-center gap-3 text-sm">
                  <Link href={`/u/${r.userId}`} className="font-semibold hover:underline">
                    {r.user.name ?? "Читатель"}
                  </Link>
                  {r.rating && <span className="text-amber-400">★ {r.rating}/10</span>}
                  <span className="text-neutral-500">{fmt.format(r.updatedAt)}</span>
                </div>
                <p className="whitespace-pre-line text-neutral-300">{r.review}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
