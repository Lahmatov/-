import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { logout } from "@/lib/actions";
import { getProfile } from "@/lib/social";
import { Plural } from "@/lib/plural";
import { BookRow } from "@/components/BookRow";
import { FollowButton } from "@/components/FollowButton";
import { NameForm } from "@/components/NameForm";
import { ShareButton } from "@/components/ShareButton";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const profile = await getProfile((await params).id, null);
  if (!profile) return {};
  const name = profile.user.name ?? "Читатель";
  return { title: `${name} — книжная полка`, description: `Прочитано книг: ${profile.counts.read}` };
}

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const profile = await getProfile(id, session?.user?.id ?? null);
  if (!profile) notFound();
  const { user, counts } = profile;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-2xl font-black text-black">
          {(user.name ?? "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{user.name ?? "Читатель"}</h1>
          <p className="text-sm text-neutral-400">
            {counts.read} {Plural.ru(counts.read, "книга прочитана", "книги прочитано", "книг прочитано")} ·{" "}
            {counts.followers} {Plural.ru(counts.followers, "подписчик", "подписчика", "подписчиков")} ·{" "}
            {counts.following} {Plural.ru(counts.following, "подписка", "подписки", "подписок")}
          </p>
        </div>
        {session?.user && !profile.isMe && <FollowButton userId={user.id} isFollowing={profile.isFollowing} />}
        <ShareButton title={user.name ?? "Читатель"} path={`/u/${user.id}`} />
      </header>

      {profile.isMe && (
        <section className="space-y-3 rounded-xl bg-neutral-900 p-4">
          <NameForm name={user.name ?? ""} />
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/import" className="btn-ghost">
              Импорт Kindle / CSV
            </Link>
            <form action={logout}>
              <button className="btn-ghost">Выйти</button>
            </form>
          </div>
        </section>
      )}

      {profile.readingNow.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Читает сейчас</h2>
          {profile.readingNow.map((e) => (
            <BookRow key={e.id} book={e.book} />
          ))}
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">Недавно прочитано</h2>
        {profile.recentlyRead.length === 0 ? (
          <p className="text-neutral-500">Пока ничего.</p>
        ) : (
          profile.recentlyRead.map((e) => (
            <BookRow key={e.id} book={e.book}>
              {e.rating && <div className="mt-1 text-sm text-amber-400">★ {e.rating}/10</div>}
            </BookRow>
          ))
        )}
      </section>

      {profile.lists.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Списки</h2>
          <div className="space-y-1">
            {profile.lists.map((l) => (
              <Link key={l.id} href={`/lists/${l.id}`} className="block rounded-lg p-2 hover:bg-neutral-900">
                <span className="font-semibold">{l.title}</span>{" "}
                <span className="text-sm text-neutral-500">
                  {l._count.items} {Plural.ru(l._count.items, "книга", "книги", "книг")}
                  {!l.isPublic && " · личный"}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
