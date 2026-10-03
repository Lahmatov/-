import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { STATUS_LABEL, isStatus, type Status } from "@/lib/status";
import { removeFromShelf, setStatus } from "@/lib/actions";
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

  const book = await db.book.findUnique({ where: { id } });
  if (!book) notFound();

  const [mine, stats, reviews] = await Promise.all([
    userId ? db.shelfEntry.findUnique({ where: { userId_bookId: { userId, bookId: id } } }) : null,
    db.shelfEntry.aggregate({ where: { bookId: id, rating: { not: null } }, _avg: { rating: true }, _count: { rating: true } }),
    db.shelfEntry.findMany({
      where: { bookId: id, isPublic: true, review: { not: null }, ...(userId ? { userId: { not: userId } } : {}) },
      include: { user: { select: { name: true, image: true } } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);
  const readers = await db.shelfEntry.count({ where: { bookId: id, status: "READ" } });
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
            {book.author}
            {book.year ? ` · ${book.year}` : ""}
          </p>
          <div className="flex gap-6 text-sm">
            <div>
              <div className="text-2xl font-bold text-amber-400">
                {stats._avg.rating ? `★ ${stats._avg.rating.toFixed(1)}` : "—"}
              </div>
              <div className="text-neutral-500">{stats._count.rating} оценок</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{readers}</div>
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
          {mine && (
            <ReviewForm
              // Пересоздаём форму, когда кнопки статуса меняют даты, — иначе поля покажут старые значения.
              key={`${mine.status}-${dateInput(mine.startedAt)}-${dateInput(mine.finishedAt)}`}
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
          <a href="/login" className="text-amber-400 hover:underline">Войдите</a>, чтобы отмечать прочитанное и писать отзывы.
        </p>
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
                  <span className="font-semibold">{r.user.name ?? "Читатель"}</span>
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
