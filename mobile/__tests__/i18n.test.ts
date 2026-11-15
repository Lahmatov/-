import { AppLanguage, L, plural, pluralRu } from "../src/i18n";

afterEach(() => AppLanguage.setEnglish(false));

test("russian is the source language", () => {
  AppLanguage.setEnglish(false);
  expect(L("Полка")).toBe("Полка");
  expect(L("Ждут отправки: %@", 3)).toBe("Ждут отправки: 3");
});

test("english translation with substitutions", () => {
  AppLanguage.setEnglish(true);
  expect(L("Полка")).toBe("Shelf");
  expect(L("Ждут отправки: %@", 3)).toBe("Waiting to sync: 3");
  expect(L("Прочитано %@%%", 40)).toMatch(/40%/);
  // Нет перевода — русский текст.
  expect(L("Строка без перевода")).toBe("Строка без перевода");
});

test("russian plural forms", () => {
  expect(pluralRu(1, "оценка", "оценки", "оценок")).toBe("оценка");
  expect(pluralRu(3, "оценка", "оценки", "оценок")).toBe("оценки");
  expect(pluralRu(5, "оценка", "оценки", "оценок")).toBe("оценок");
  expect(pluralRu(11, "оценка", "оценки", "оценок")).toBe("оценок");
  expect(pluralRu(21, "оценка", "оценки", "оценок")).toBe("оценка");
  expect(pluralRu(112, "оценка", "оценки", "оценок")).toBe("оценок");
  expect(plural(2, "оценка", "оценки", "оценок")).toBe("оценки");
});
