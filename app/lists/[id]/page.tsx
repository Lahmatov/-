import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { deleteListAction, toggleListItem } from "@/lib/actions";
import { getList } from "@/lib/lists";
import { BookRow } from "@/components/BookRow";
import { ListForm } from "@/components/ListForm";
import { SubmitButton } from "@/components/SubmitButton";
import { ShareButton } from "@/components/ShareButton";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const result = await getList((await params).id, null);
  if (!result) return {};
  const { list } = result;
  return {
    title: list.title,
    description: list.description ?? `Список книг: ${list.items.length}`,
    openGraph: { title: list.title, images: list.items.flatMap((i) => (i.book.coverUrl ? [i.book.coverUrl] : [])).slice(0, 1) },
  };
}

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const result = await getList(id, session?.user?.id ?? null);
  if (!result) notFound();
  const { list, isOwner } = result;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-start gap-3">
          <h1 className="flex-1 text-2xl font-bold">{list.title}</h1>
          {list.isPublic && <ShareButton title={list.title} path={`/lists/${list.id}`} />}
        </div>
        <p className="text-sm text-neutral-400">
          Список{" "}
          <Link href={`/u/${list.user.id}`} className="hover:underline">
            {list.user.name ?? "читателя"}
          </Link>
          {!list.isPublic && " · личный"}
        </p>
        {list.description && <p className="mt-2 whitespace-pre-line text-neutral-300">{list.description}</p>}
      </header>

      {list.items.length === 0 ? (
        <p className="text-neutral-500">
          В списке пока нет книг. Добавить книгу можно на её странице — блок «В списки».
        </p>
      ) : (
        <div className="space-y-1">
          {list.items.map((item) => (
            <div key={item.bookId} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <BookRow book={item.book} />
              </div>
              {isOwner && (
                <form action={toggleListItem.bind(null, list.id, item.bookId, false)}>
                  <SubmitButton className="btn text-neutral-500 hover:text-red-400">Убрать</SubmitButton>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      {isOwner && (
        <details className="max-w-md rounded-xl bg-neutral-900 p-4">
          <summary className="cursor-pointer font-semibold">Изменить список</summary>
          <div className="mt-4 space-y-4">
            <ListForm
              mode="edit"
              listId={list.id}
              title={list.title}
              description={list.description}
              isPublic={list.isPublic}
            />
            <form action={deleteListAction.bind(null, list.id)}>
              <SubmitButton className="btn text-red-400 hover:bg-red-950">Удалить список</SubmitButton>
            </form>
          </div>
        </details>
      )}
    </div>
  );
}
