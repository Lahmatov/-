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
