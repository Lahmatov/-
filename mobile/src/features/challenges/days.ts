// Календарный день без часового пояса для формы челленджа (без нативного DatePicker).

export type Day = { year: number; month: number; day: number };
export type DayPart = "day" | "month" | "year";

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Сегодня в календаре телефона — так, как его видит пользователь. */
export function today(now: Date = new Date()): Day {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/** Через n месяцев; день прижимается к концу месяца (31 янв. + 1 мес. → 28/29 февр.). */
export function addMonths(value: Day, n: number): Day {
  const index = value.year * 12 + (value.month - 1) + n;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return { year, month, day: Math.min(value.day, daysInMonth(year, month)) };
}

/**
 * Изменить одну часть даты на delta. День и месяц ходят по кругу внутри месяца/года
 * (как колёсики выбора даты), год — без ограничений; день прижимается к длине месяца.
 */
export function shiftDay(value: Day, part: DayPart, delta: number): Day {
  const wrap = (v: number, max: number) => ((((v - 1 + delta) % max) + max) % max) + 1;
  let { year, month, day } = value;
  if (part === "year") year += delta;
  if (part === "month") month = wrap(month, 12);
  if (part === "day") day = wrap(day, daysInMonth(year, month));
  return { year, month, day: Math.min(day, daysInMonth(year, month)) };
}

export function compareDays(a: Day, b: Day): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

/** "YYYY-MM-DD" для сервера. */
export function dayToString(value: Day): string {
  return `${String(value.year).padStart(4, "0")}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}
