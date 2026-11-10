import { getLocales } from "expo-localization";
import en from "./en.json";
import enBooks from "./en.books.json";
import enCommunity from "./en.community.json";
import enProfile from "./en.profile.json";
import enSocial from "./en.social.json";

// Ключ — русский текст из кода (русский — исходный язык), перевод — в en.json.
// Строки без перевода показываются по-русски.

// en.json — общие строки; en.<раздел>.json — строки разделов (чтобы правки разных разделов не конфликтовали).
const dictionary: Record<string, string> = { ...en, ...enBooks, ...enSocial, ...enCommunity, ...enProfile };

let english = detectEnglish();

function detectEnglish(): boolean {
  try {
    const code = getLocales()[0]?.languageCode ?? "ru";
    return code !== "ru";
  } catch {
    return false;
  }
}

export const AppLanguage = {
  get isEnglish() {
    return english;
  },
  get code() {
    return english ? "en" : "ru";
  },
  get locale() {
    return english ? "en-US" : "ru-RU";
  },
  /** Только для тестов. */
  setEnglish(value: boolean) {
    english = value;
  },
};

/** Перевод с подстановками: каждое %@ (или %d) заменяется очередным аргументом. */
export function L(key: string, ...args: (string | number)[]): string {
  const template = english ? dictionary[key] ?? key : key;
  let i = 0;
  return template.replace(/%(@|d|%)/g, (match) => {
    if (match === "%%") return "%";
    const value = args[i++];
    return value === undefined ? "" : String(value);
  });
}

/** Склонение по числу: в русском три формы, в английском — перевод формы one или many. */
export function plural(n: number, one: string, few: string, many: string): string {
  if (english) return L(n === 1 ? one : many);
  return pluralRu(n, one, few, many);
}

export function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = Math.abs(n) % 10;
  const mod100 = Math.abs(n) % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
}
