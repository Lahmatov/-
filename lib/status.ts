export const STATUSES = ["WANT", "READING", "PAUSED", "READ", "DROPPED"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  WANT: "Хочу прочитать",
  READING: "Читаю",
  PAUSED: "Отложил",
  READ: "Прочитал",
  DROPPED: "Бросил",
};

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

/** Подписи событий в ленте — без глаголов прошедшего времени, чтобы не угадывать род. */
export const FEED_LABEL: Record<Status, string> = {
  WANT: "хочет прочитать",
  READING: "читает",
  PAUSED: "отложено",
  READ: "прочитано",
  DROPPED: "брошено",
};
