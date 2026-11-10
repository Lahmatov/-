import type { Book, ClubDetails, ReadingStatus, Shelf } from "../../api/models";
import { L } from "../../i18n";

export function clubInviteText(club: Pick<ClubDetails, "name" | "inviteCode">): string {
  return L("Присоединяйтесь к книжному клубу «%@» в приложении «Полка». Код приглашения: %@", club.name, club.inviteCode);
}

/** «Ещё не начал» / «Дочитал до главы 3». */
export function myChapterTitle(chapter: number): string {
  return chapter === 0 ? L("Ещё не начал") : L("Дочитал до главы %@", String(chapter));
}

/** Подпись участника: «не начал» / «гл. 3». */
export function memberChapterTitle(chapter: number): string {
  return chapter === 0 ? L("не начал") : L("гл. %@", String(chapter));
}

/** Главы для выбора в обсуждении: 0 — общее сообщение без спойлеров, затем 1…max. */
export function postChapterOptions(range: { min: number; max: number }): number[] {
  const chapters = [0];
  for (let c = Math.max(1, range.min); c <= range.max; c++) chapters.push(c);
  return chapters;
}

// Сначала то, что читаю или хочу прочитать.
const SHELF_ORDER: ReadingStatus[] = ["READING", "WANT", "PAUSED", "READ", "DROPPED"];

/** Книги с полки для выбора в новом клубе. */
export function clubBookChoices(shelf: Shelf): Book[] {
  return [...shelf.items].sort((a, b) => SHELF_ORDER.indexOf(a.entry.status) - SHELF_ORDER.indexOf(b.entry.status)).map((item) => item.book);
}
