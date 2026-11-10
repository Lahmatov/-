import { formatDay } from "../../api/dates";
import type { GenreRef } from "../../api/models";
import { L, plural } from "../../i18n";

// Подписи челленджей (как ChallengeText в iOS-приложении).

/** «3 книги». */
export function booksCount(n: number): string {
  return `${n} ${plural(n, "книга", "книги", "книг")}`;
}

/** «5 участников». */
export function participantsCount(n: number): string {
  return `${n} ${plural(n, "участник", "участника", "участников")}`;
}

/** «1 июн. 2026 г. — 31 авг. 2026 г.» — календарные дни в UTC, как их хранит сервер. */
export function challengePeriod(startsAt: string, endsAt: string): string {
  return `${formatDay(startsAt)} — ${formatDay(endsAt)}`;
}

/** «5 книг в жанре «Фантастика» · период». */
export function challengeSummary(c: { goal: number; genre: GenreRef | null; startsAt: string; endsAt: string }): string {
  const books = booksCount(c.goal);
  const what = c.genre ? L("%@ в жанре «%@»", books, c.genre.name) : books;
  return `${what} · ${challengePeriod(c.startsAt, c.endsAt)}`;
}

/** Текст приглашения: у публичного челленджа код не нужен. */
export function challengeInviteText(c: { title: string; isPublic: boolean }, code: string): string {
  return c.isPublic
    ? L("Присоединяйтесь к челленджу «%@» в приложении «Полка»!", c.title)
    : L("Присоединяйтесь к челленджу «%@» в приложении «Полка». Код приглашения: %@", c.title, code);
}
