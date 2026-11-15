import { AppLanguage } from "../i18n";

// Сервер отдаёт даты в ISO 8601 ("2026-10-01T10:00:00.000Z"). Даты начала/окончания чтения — календарные
// дни: храним и показываем их в UTC, как сервер, чтобы день не «съезжал» из-за часового пояса.

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "YYYY-MM-DD" в UTC. */
export function dayString(date: Date): string {
  const y = date.getUTCFullYear().toString().padStart(4, "0");
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = date.getUTCDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Календарный день из ISO-строки сервера: «12 окт. 2026 г.» / «Oct 12, 2026». */
export function formatDay(value: string | Date): string {
  const date = typeof value === "string" ? parseDate(value) : value;
  if (!date) return "";
  return date.toLocaleDateString(AppLanguage.locale, { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
}

/** Дата и время события (лента, комментарии) в часовом поясе телефона. */
export function formatDateTime(value: string): string {
  const date = parseDate(value);
  if (!date) return "";
  return date.toLocaleString(AppLanguage.locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** «5 мин. назад», «вчера» и т. п. */
export function formatRelative(value: string, now: Date = new Date()): string {
  const date = parseDate(value);
  if (!date) return "";
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(AppLanguage.locale, { numeric: "auto" });
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(Math.round(seconds), "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), "day");
  return formatDay(date);
}

/** Названия месяцев в именительном падеже: «январь» / «янв.». */
export function monthNames(short = false): string[] {
  const format = new Intl.DateTimeFormat(AppLanguage.locale, { month: short ? "short" : "long", timeZone: "UTC" });
  return Array.from({ length: 12 }, (_, i) => {
    const parts = format.formatToParts(new Date(Date.UTC(2026, i, 15)));
    return parts.find((p) => p.type === "month")?.value ?? String(i + 1);
  });
}
