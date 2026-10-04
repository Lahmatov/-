export type Lang = "ru" | "en";

/** Язык ответа по заголовку Accept-Language (iOS-приложение передаёт язык интерфейса). */
export function langOf(req: Request): Lang {
  return req.headers.get("accept-language")?.trim().toLowerCase().startsWith("en") ? "en" : "ru";
}
