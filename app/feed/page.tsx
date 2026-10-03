import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getFeed, searchUsers } from "@/lib/social";
import { FEED_LABEL, isStatus } from "@/lib/status";
import { timeAgo } from "@/lib/time";
import { BookRow } from "@/components/BookRow";
import { ReviewSocial } from "@/components/ReviewSocial";
import { socialFor } from "@/lib/reviews";

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ q?: string; cursor?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { q, cursor } = await searchParams;
  const [feed, people] = await Promise.all([getFeed(session.user.id, cursor), q ? searchUsers(q) : []]);
  const social = await socialFor(
    feed.items.filter((a) => a.type === "REVIEW" && a.entryId).map((a) => a.entryId!),
    session.user.id,
  );

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold">Лента</h1>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Найти людей по имени…" className="input" />
          <button className="btn-ghost">Найти</button>
        </form>
        {q && (
          <div className="space-y-1">
            {people.length === 0 ? (
              <p className="text-sm text-neutral-500">Никого не нашли.</p>
            ) : (
              people
                .filter((u) => u.id !== session.user.id)
                .map((u) => (
                  <Link key={u.id} href={`/u/${u.id}`} className="block rounded-lg p-2 hover:bg-neutral-900">
                    {u.name}
                  </Link>
                ))
            )}
          </div>
        )}
      </section>

      {feed.followingCount === 0 ? (
        <p className="text-neutral-400">
          Подпишитесь на друзей — здесь появится, что они читают и как оценивают книги. Найдите их по имени выше или
          нажмите на имя автора отзыва на странице книги.
        </p>
      ) : feed.items.length === 0 ? (
        <p className="text-neutral-400">Пока тихо — ваши подписки ещё ничего не отметили.</p>
      ) : (
        <div className="space-y-4">
          {feed.items.map((a) => (
            <article key={a.id} className="rounded-lg border border-neutral-800 p-3">
              <div className="mb-2 flex flex-wrap items-baseline gap-x-2 text-sm">
                <Link href={`/u/${a.user.id}`} className="font-semibold hover:underline">
                  {a.user.name ?? "Читатель"}
                </Link>
                <span className="text-neutral-400">
                  {a.type === "REVIEW"
                    ? a.review
                      ? "отзыв"
                      : "оценка"
                    : isStatus(a.status)
                      ? FEED_LABEL[a.status]
                      : ""}
                </span>
                {a.rating && <span className="text-amber-400">★ {a.rating}/10</span>}
                <span className="ml-auto text-xs text-neutral-500">{timeAgo(a.createdAt)}</span>
              </div>
              <BookRow book={a.book} />
              {a.review && <p className="mt-2 line-clamp-6 whitespace-pre-line text-neutral-300">{a.review}</p>}
              {a.type === "REVIEW" && a.entryId && (
                <ReviewSocial
                  entryId={a.entryId}
                  reviewAuthorId={a.user.id}
                  path={`/books/${a.book.id}`}
                  viewerId={session.user.id}
                  likes={social.get(a.entryId)?.likes ?? 0}
                  likedByMe={social.get(a.entryId)?.likedByMe ?? false}
                  comments={social.get(a.entryId)?.comments ?? 0}
                />
              )}
            </article>
          ))}
          {feed.nextCursor && (
            <Link href={`/feed?cursor=${feed.nextCursor}`} className="btn-ghost w-full">
              Показать ещё
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
