import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyLists } from "@/lib/lists";
import { Plural } from "@/lib/plural";
import { ListForm } from "@/components/ListForm";

export default async function ListsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const lists = await getMyLists(session.user.id);
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Мои списки</h1>
      {lists.length === 0 ? (
        <p className="text-neutral-400">Соберите подборку: «Лучшее за год», «Посоветовать маме», «Взять в отпуск».</p>
      ) : (
        <div className="space-y-2">
          {lists.map((l) => (
            <Link key={l.id} href={`/lists/${l.id}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-neutral-900">
              <div className="flex -space-x-4">
                {l.covers.length === 0 && <div className="h-12 w-8 rounded bg-neutral-800" />}
                {l.covers.map((c) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={c} src={c} alt="" className="h-12 w-8 rounded border-2 border-neutral-950 object-cover" />
                ))}
              </div>
              <div>
                <div className="font-semibold">{l.title}</div>
                <div className="text-sm text-neutral-500">
                  {l.count} {Plural.ru(l.count, "книга", "книги", "книг")}
                  {!l.isPublic && " · личный"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <section className="max-w-md rounded-xl bg-neutral-900 p-4">
        <h2 className="mb-3 font-semibold">Новый список</h2>
        <ListForm mode="create" />
      </section>
    </div>
  );
}
