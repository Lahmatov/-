import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ImportForm } from "@/components/ImportForm";

export default async function ImportPage() {
  if (!(await auth())) redirect("/login");
  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-2xl font-bold">Импорт библиотеки</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Kindle</h2>
        <p className="text-sm text-neutral-400">
          Подключите Kindle к компьютеру по USB и загрузите файл <code>documents/My Clippings.txt</code>. Книги, в которых
          вы делали выделения, попадут на полку «Читаю».
        </p>
        <ImportForm kind="kindle" accept=".txt" />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Goodreads или CSV</h2>
        <p className="text-sm text-neutral-400">
          Экспорт Goodreads (My Books → Import and export → Export Library) загружается как есть — с полками, оценками и
          отзывами. Также подойдёт любой CSV с колонками <code>Title, Author, Year, Status</code>.
        </p>
        <ImportForm kind="csv" accept=".csv" />
      </section>

      <section className="space-y-2 text-sm text-neutral-400">
        <h2 className="text-lg font-semibold text-neutral-100">Apple Books</h2>
        <p>
          У Apple Books нет публичного API и функции экспорта, поэтому автоматической синхронизации пока нет. Можно выписать
          книги в таблицу (Numbers, Excel), сохранить как CSV и загрузить выше.
        </p>
      </section>
    </div>
  );
}
