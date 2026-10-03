import { Plural } from "@/lib/plural";

const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const MONTHS_FULL = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

const books = (n: number) => `${n} ${Plural.ru(n, "книга", "книги", "книг")}`;

/** Прочитанные книги по месяцам: столбцы с подсказкой при наведении и таблица для скринридеров. */
export function MonthChart({ byMonth }: { byMonth: number[] }) {
  const max = Math.max(...byMonth);
  const peak = byMonth.indexOf(max);
  return (
    <figure className="pt-6">
      <div className="relative flex h-40 items-end gap-0.5 border-b border-neutral-800" aria-hidden="true">
        {byMonth.map((count, i) => (
          <div key={i} tabIndex={-1} className="group relative flex h-full flex-1 items-end justify-center">
            {count > 0 && (
              <div
                className="w-full max-w-6 rounded-t bg-amber-500 transition group-hover:bg-amber-400"
                style={{ height: `${(count / max) * 100}%` }}
              />
            )}
            {i === peak && count > 0 && (
              <span
                className="absolute text-xs text-neutral-300"
                style={{ bottom: `calc(${(count / max) * 100}% + 4px)` }}
              >
                {count}
              </span>
            )}
            <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-100 shadow group-hover:block">
              {MONTHS_FULL[i]}: {books(count)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-0.5 text-center text-[10px] text-neutral-500" aria-hidden="true">
        {MONTHS.map((m) => (
          <div key={m} className="flex-1">
            {m}
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>Прочитано книг по месяцам</caption>
        <tbody>
          {byMonth.map((count, i) => (
            <tr key={i}>
              <th scope="row">{MONTHS_FULL[i]}</th>
              <td>{count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
