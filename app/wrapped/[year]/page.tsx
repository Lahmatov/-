import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { parseYear } from "@/lib/stats";
import { getWrapped } from "@/lib/wrapped";
import { Plural } from "@/lib/plural";

const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];

export default async function WrappedPage({ params }: { params: Promise<{ year: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const year = parseYear((await params).year);
  const w = await getWrapped(session.user.id, year);

  const facts: [string, string][] = [];
  if (w.pagesRead) facts.push(["страниц прочитано", w.pagesRead.toLocaleString("ru-RU")]);
  if (w.avgRating) facts.push(["средняя оценка", `★ ${w.avgRating}`]);
  if (w.topAuthor) facts.push(["любимый автор", `${w.topAuthor.value} (${w.topAuthor.count})`]);
  if (w.topGenre) facts.push(["любимый жанр", w.topGenre.name]);
  if (w.bestBook) facts.push(["лучшая книга", `«${w.bestBook.book.title}» — ${w.bestBook.rating}/10`]);
  if (w.longestBook) facts.push(["самая длинная", `«${w.longestBook.book.title}», ${w.longestBook.pages} стр.`]);
  if (w.busiestMonth !== null) facts.push(["самый книжный месяц", MONTHS[w.busiestMonth]]);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-6 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-700 p-8 text-black">
        <div className="text-sm font-semibold uppercase tracking-widest">Итоги {year}</div>
        <div>
          <div className="text-7xl font-black">{w.booksRead}</div>
          <div className="text-xl font-bold">{Plural.ru(w.booksRead, "книга прочитана", "книги прочитано", "книг прочитано")}</div>
        </div>
        {facts.length > 0 ? (
          <dl className="space-y-3">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs uppercase tracking-wide opacity-70">{label}</dt>
                <dd className="text-lg font-bold leading-tight">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="font-semibold">Отмечайте прочитанные книги — и в конце года здесь будет ваша статистика.</p>
        )}
        <div className="text-sm font-semibold opacity-70">{w.name} · Книжная полка</div>
      </div>
      <div className="flex justify-center gap-3">
        <a href={`/wrapped/${year}/image`} download={`itogi-${year}.png`} className="btn-primary">
          Скачать картинку
        </a>
      </div>
      <p className="text-center text-sm text-neutral-500">Картинка 1080×1350 — подходит для сторис и постов.</p>
    </div>
  );
}
