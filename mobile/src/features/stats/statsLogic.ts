import { monthNames } from "../../api/dates";
import type { ImportResult, Wrapped, YearStats } from "../../api/models";
import { AppLanguage, L, plural } from "../../i18n";

// Логика вкладки «Итоги», итогов года и импорта без интерфейса — покрыта тестами.

/** «12 книг прочитано в 2026 году — цель выполнена!» */
export function statsSummary(stats: YearStats): string {
  const books = `${stats.readCount} ${plural(stats.readCount, "книга прочитана", "книги прочитано", "книг прочитано")}`;
  const done = stats.goal != null && stats.readCount >= stats.goal;
  return L("%@ в %@ году", books, String(stats.year)) + (done ? L(" — цель выполнена!") : "");
}

export type GoalInput = { ok: true; target: number | null } | { ok: false; message: string };

/** Текст поля «Сколько книг» → цель. Пустое поле — убрать цель. */
export function parseGoal(text: string): GoalInput {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: true, target: null };
  if (!/^\d+$/.test(trimmed)) return { ok: false, message: L("Цель — от 1 до 1000 книг") };
  const target = Number(trimmed);
  if (target < 1 || target > 1000) return { ok: false, message: L("Цель — от 1 до 1000 книг") };
  return { ok: true, target };
}

/** Индекс месяца с наибольшим числом книг (первый из равных); -1, если книг нет. */
export function peakMonth(byMonth: number[]): number {
  let peak = -1;
  byMonth.forEach((count, i) => {
    if (count > 0 && (peak < 0 || count > byMonth[peak]!)) peak = i;
  });
  return peak;
}

/** «Март: 3 книги». */
export function monthLabel(index: number, count: number): string {
  const name = capitalize(monthNames()[index] ?? String(index + 1));
  return `${name}: ${count} ${plural(count, "книга", "книги", "книг")}`;
}

export function capitalize(text: string): string {
  return text.length ? text.charAt(0).toLocaleUpperCase(AppLanguage.locale) + text.slice(1) : text;
}

export function formatNumber(value: number): string {
  return value.toLocaleString(AppLanguage.locale, { maximumFractionDigits: 2 });
}

/** Средняя оценка с одним знаком: «8.5»; нет оценок — «—». */
export function formatAverage(value: number | null | undefined): string {
  return value == null ? "—" : value.toFixed(1);
}

/** До пяти фактов для карточки итогов года: [подпись, значение]. */
export function wrappedFacts(wrapped: Wrapped): [string, string][] {
  const result: [string, string][] = [];
  const months = monthNames();
  if (wrapped.pagesRead > 0) result.push([L("страниц прочитано"), formatNumber(wrapped.pagesRead)]);
  if (wrapped.avgRating != null) result.push([L("средняя оценка"), `★ ${formatNumber(wrapped.avgRating)}`]);
  if (wrapped.topAuthor) result.push([L("любимый автор"), wrapped.topAuthor.value]);
  if (wrapped.topGenre) result.push([L("любимый жанр"), wrapped.topGenre.name]);
  if (wrapped.bestBook) result.push([L("лучшая книга"), `«${wrapped.bestBook.book.title}» — ${wrapped.bestBook.rating}/10`]);
  if (wrapped.busiestMonth != null && wrapped.busiestMonth >= 0 && wrapped.busiestMonth < months.length) {
    result.push([L("самый книжный месяц"), months[wrapped.busiestMonth]!]);
  }
  return result.slice(0, 5);
}

export function wrappedBooksLabel(wrapped: Wrapped): string {
  return plural(wrapped.booksRead, "книга прочитана", "книги прочитано", "книг прочитано");
}

/** Текст для «Поделиться»: то же, что на карточке. */
export function wrappedShareText(wrapped: Wrapped): string {
  return [
    L("Итоги %@", String(wrapped.year)),
    `${wrapped.booksRead} ${wrappedBooksLabel(wrapped)}`,
    ...wrappedFacts(wrapped).map(([label, value]) => `${label}: ${value}`),
    L("%@ · Книжная полка", wrapped.name),
  ].join("\n");
}

/** Строки результата импорта: «12 книг найдено», «10 добавлено на полку», «3 новые цитаты». */
export function importResultLines(result: ImportResult): string[] {
  const lines = [
    `${result.found} ${plural(result.found, "книга найдена", "книги найдено", "книг найдено")}`,
    `${result.added} ${plural(result.added, "добавлена на полку", "добавлены на полку", "добавлено на полку")}`,
  ];
  if (result.quotes != null && result.quotes > 0) {
    lines.push(`${result.quotes} ${plural(result.quotes, "новая цитата", "новые цитаты", "новых цитат")}`);
  }
  return lines;
}
